import type { AnalyzeResponse } from "@/lib/api-types";
import { resolveInferenceMode, type InferenceMode } from "@/lib/llm-config";
import { completeJson } from "@/lib/llm";
import {
  buildMockGapAnalysis,
  buildMockJobDescriptionProfile,
  buildMockMatchOriginal,
  buildMockResumeProfile,
} from "@/lib/mock-data";
import { logPipelineStage } from "@/lib/pipeline-logger";
import { preprocessMatchScore } from "@/lib/llm-preprocess";
import { createRun, patchTailoringRun } from "@/lib/run-store";
import { capInputText } from "@/lib/text-limits";
import { z } from "zod";
import {
  GapAnalysisSchema,
  JobDescriptionProfileSchema,
  MatchScoreSchema,
  ResumeProfileSchema,
} from "@/schemas";
import { buildCombinedAnalyzeMessages } from "@/prompts/combined-analyze";

const CombinedAnalyzeSchema = z.object({
  resumeProfile: ResumeProfileSchema,
  jobDescriptionProfile: JobDescriptionProfileSchema,
  matchOriginal: MatchScoreSchema,
  gapAnalysis: GapAnalysisSchema,
});

function preprocessCombinedAnalyze(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const o = raw as Record<string, unknown>;
  if (o.matchOriginal) {
    o.matchOriginal = preprocessMatchScore(o.matchOriginal);
  }
  return o;
}

async function timed<T>(
  tailoringRunId: string,
  stage: Parameters<typeof logPipelineStage>[0]["stage"],
  mode: InferenceMode,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logPipelineStage({
      tailoringRunId,
      stage,
      ok: true,
      durationMs: Date.now() - start,
      inferenceMode: mode,
    });
    return result;
  } catch (e) {
    logPipelineStage({
      tailoringRunId,
      stage,
      ok: false,
      durationMs: Date.now() - start,
      inferenceMode: mode,
      errorCode: e instanceof Error ? e.name : "UNKNOWN",
    });
    throw e;
  }
}

export type AnalyzePipelineResult = AnalyzeResponse & {
  inferenceMode: InferenceMode;
  inferenceNotice?: string;
};

export async function runAnalyzePipeline(input: {
  resumeText: string;
  jdText: string;
}): Promise<AnalyzePipelineResult> {
  const mode = resolveInferenceMode();
  const resumeText = capInputText(input.resumeText, "Resume");
  const jdText = capInputText(input.jdText, "Job description");
  const { tailoringRun } = createRun({ resumeText, jdText });
  const runId = tailoringRun.id;

  if (mode === "mock") {
    const resumeProfile = buildMockResumeProfile(resumeText);
    const jobDescriptionProfile = buildMockJobDescriptionProfile(jdText);
    const matchOriginal = buildMockMatchOriginal();
    const gapAnalysis = buildMockGapAnalysis();

    patchTailoringRun(runId, {
      resumeProfile,
      jobDescriptionProfile,
      matchOriginal,
      gapAnalysis,
    });

    return {
      tailoringRunId: runId,
      resumeProfile,
      jobDescriptionProfile,
      matchOriginal,
      gapAnalysis,
      inferenceMode: "mock",
      inferenceNotice:
        "GROQ_API_KEY is not set (or LLM_FORCE_MOCK=true). Using fixture-based mock data until you add a key to .env.",
    };
  }

  const combined = await timed(runId, "analyze.combined", mode, () =>
    completeJson({
      messages: buildCombinedAnalyzeMessages(resumeText, jdText),
      schema: CombinedAnalyzeSchema,
      schemaHint: "CombinedAnalyze",
      preprocess: preprocessCombinedAnalyze,
    })
  );

  const { resumeProfile, jobDescriptionProfile, matchOriginal, gapAnalysis } = combined;

  patchTailoringRun(runId, {
    resumeProfile,
    jobDescriptionProfile,
    matchOriginal,
    gapAnalysis,
  });

  return {
    tailoringRunId: runId,
    resumeProfile,
    jobDescriptionProfile,
    matchOriginal,
    gapAnalysis,
    inferenceMode: "groq",
  };
}
