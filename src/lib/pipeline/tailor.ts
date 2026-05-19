import type { TailorResponse } from "@/lib/api-types";
import { LlmError } from "@/lib/llm";
import { resolveInferenceMode, type InferenceMode } from "@/lib/llm-config";
import { completeJson } from "@/lib/llm";
import {
  buildMockGapAnalysis,
  buildMockMatchTailored,
  buildMockTailoredResume,
} from "@/lib/mock-data";
import { logPipelineStage } from "@/lib/pipeline-logger";
import { preprocessMatchScore, preprocessTailoredResume } from "@/lib/llm-preprocess";
import { getRun, patchTailoringRun, type RunRecord } from "@/lib/run-store";
import { assembleResumeForScoring } from "@/lib/resume-assembly";
import { checkTailoringConsistency } from "@/lib/consistency";
import {
  GapAnalysisSchema,
  MatchScoreSchema,
  TailoredResumeSchema,
} from "@/schemas";
import { buildBulletRewriterMessages } from "@/prompts/bullet-rewriter";
import { buildGapAnalysisMessages } from "@/prompts/gap-analysis";
import { buildMatchScoringMessages } from "@/prompts/match-scoring";

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

export type TailorPipelineResult = TailorResponse & {
  inferenceMode: InferenceMode;
  inferenceNotice?: string;
};

function requireAnalyzedRun(rec: RunRecord) {
  const { resumeProfile, jobDescriptionProfile, matchOriginal } = rec.tailoringRun;
  if (!resumeProfile || !jobDescriptionProfile || !matchOriginal) {
    throw new Error("INVALID_STATE");
  }
  return { resumeProfile, jobDescriptionProfile, matchOriginal };
}

export async function runTailorPipeline(
  tailoringRunId: string
): Promise<TailorPipelineResult> {
  const rec = getRun(tailoringRunId);
  if (!rec) throw new Error("NOT_FOUND");

  const mode = resolveInferenceMode();
  const { resumeProfile, jobDescriptionProfile, matchOriginal } =
    requireAnalyzedRun(rec);

  if (mode === "mock") {
    const tailoredResume = buildMockTailoredResume();
    const matchTailored = buildMockMatchTailored(matchOriginal);
    const gapAnalysis = buildMockGapAnalysis();
    const consistencyReport = checkTailoringConsistency(resumeProfile, tailoredResume);

    patchTailoringRun(tailoringRunId, {
      tailoredResume,
      matchTailored,
      gapAnalysis,
      consistencyReport,
      status: "ready_for_export",
    });

    return {
      tailoringRunId,
      tailoredResume,
      matchTailored,
      gapAnalysis,
      consistencyReport,
      inferenceMode: "mock",
      inferenceNotice:
        "GROQ_API_KEY is not set (or LLM_FORCE_MOCK=true). Using fixture-based mock tailoring.",
    };
  }

  const resumeJson = JSON.stringify(resumeProfile);
  const jdJson = JSON.stringify(jobDescriptionProfile);

  const tailoredResume = await timed(tailoringRunId, "tailor.rewrite", mode, () =>
    completeJson({
      messages: buildBulletRewriterMessages({ resumeJson, jdJson }),
      schema: TailoredResumeSchema,
      schemaHint: "TailoredResume",
      preprocess: preprocessTailoredResume,
    })
  );

  const assembled = assembleResumeForScoring(resumeProfile, tailoredResume);
  const assembledJson = JSON.stringify(assembled);

  const [matchTailored, gapAnalysis] = await Promise.all([
    timed(tailoringRunId, "tailor.match", mode, () =>
      completeJson({
        messages: buildMatchScoringMessages({
          resumeJson: assembledJson,
          jdJson,
          label: "tailored resume",
        }),
        schema: MatchScoreSchema,
        schemaHint: "MatchScore",
        preprocess: preprocessMatchScore,
      })
    ),
    timed(tailoringRunId, "tailor.gaps", mode, () =>
      completeJson({
        messages: buildGapAnalysisMessages({
          resumeJson: assembledJson,
          jdJson,
        }),
        schema: GapAnalysisSchema,
        schemaHint: "GapAnalysis",
      })
    ),
  ]);

  const consistencyReport = checkTailoringConsistency(resumeProfile, tailoredResume);

  patchTailoringRun(tailoringRunId, {
    tailoredResume,
    matchTailored,
    gapAnalysis,
    consistencyReport,
    status: "ready_for_export",
  });

  return {
    tailoringRunId,
    tailoredResume,
    matchTailored,
    gapAnalysis,
    consistencyReport,
    inferenceMode: "groq",
  };
}

export function mapTailorError(e: unknown): { status: number; body: object } {
  if (e instanceof Error && e.message === "NOT_FOUND") {
    return { status: 404, body: { error: "Run not found", code: "NOT_FOUND" } };
  }
  if (e instanceof Error && e.message === "INVALID_STATE") {
    return {
      status: 409,
      body: {
        error: "Run has not been analyzed yet. Call POST /api/analyze first.",
        code: "INVALID_STATE",
      },
    };
  }
  if (e instanceof LlmError) {
    const status =
      e.code === "GROQ_RATE_LIMIT"
        ? 429
        : e.code === "GROQ_UNAUTHORIZED"
          ? 401
          : e.code === "GROQ_NOT_CONFIGURED"
            ? 503
            : e.code === "LLM_VALIDATION_FAILED"
              ? 502
              : 502;
    return {
      status,
      body: { error: e.message, code: e.code },
    };
  }
  return {
    status: 500,
    body: {
      error: e instanceof Error ? e.message : "Tailoring failed",
      code: "INTERNAL",
    },
  };
}
