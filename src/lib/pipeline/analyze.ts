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
import {
  GapAnalysisSchema,
  JobDescriptionProfileSchema,
  MatchScoreSchema,
  ResumeProfileSchema,
} from "@/schemas";
import { buildGapAnalysisMessages } from "@/prompts/gap-analysis";
import { buildJdExtractionMessages } from "@/prompts/jd-extraction";
import { buildMatchScoringMessages } from "@/prompts/match-scoring";
import { buildResumeParserMessages } from "@/prompts/resume-parser";

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

  const [resumeProfile, jobDescriptionProfile] = await Promise.all([
    timed(runId, "analyze.resume", mode, () =>
      completeJson({
        messages: buildResumeParserMessages(resumeText),
        schema: ResumeProfileSchema,
        schemaHint: "ResumeProfile",
      })
    ),
    timed(runId, "analyze.jd", mode, () =>
      completeJson({
        messages: buildJdExtractionMessages(jdText),
        schema: JobDescriptionProfileSchema,
        schemaHint: "JobDescriptionProfile",
      })
    ),
  ]);

  const resumeJson = JSON.stringify(resumeProfile);
  const jdJson = JSON.stringify(jobDescriptionProfile);

  const [matchOriginal, gapAnalysis] = await Promise.all([
    timed(runId, "analyze.match", mode, () =>
      completeJson({
        messages: buildMatchScoringMessages({
          resumeJson,
          jdJson,
          label: "original resume",
        }),
        schema: MatchScoreSchema,
        schemaHint: "MatchScore",
        preprocess: preprocessMatchScore,
      })
    ),
    timed(runId, "analyze.gaps", mode, () =>
      completeJson({
        messages: buildGapAnalysisMessages({ resumeJson, jdJson }),
        schema: GapAnalysisSchema,
        schemaHint: "GapAnalysis",
      })
    ),
  ]);

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
