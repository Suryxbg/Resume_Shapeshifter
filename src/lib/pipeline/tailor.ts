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
import {
  preprocessMatchScore,
  preprocessTailoredResume,
} from "@/lib/llm-preprocess";
import {
  createRun,
  getMap,
  getRun,
  patchTailoringRun,
  type RunRecord,
} from "@/lib/run-store";
import { assembleResumeForScoring } from "@/lib/resume-assembly";
import { checkTailoringConsistency } from "@/lib/consistency";
import { z } from "zod";
import {
  GapAnalysisSchema,
  MatchScoreSchema,
  TailoredResumeSchema,
} from "@/schemas";
import { buildCombinedTailorMessages } from "@/prompts/combined-tailor";

const CombinedTailorSchema = z.object({
  tailoredResume: TailoredResumeSchema,
  matchTailored: MatchScoreSchema,
  gapAnalysis: GapAnalysisSchema,
});

function preprocessCombinedTailor(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const o = raw as Record<string, unknown>;
  if (o.tailoredResume) {
    o.tailoredResume = preprocessTailoredResume(o.tailoredResume);
  }
  if (o.matchTailored) {
    o.matchTailored = preprocessMatchScore(o.matchTailored);
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

export type TailorPipelineResult = TailorResponse & {
  inferenceMode: InferenceMode;
  inferenceNotice?: string;
};

function requireAnalyzedRun(rec: RunRecord) {
  const { resumeProfile, jobDescriptionProfile, matchOriginal } =
    rec.tailoringRun;
  if (!resumeProfile || !jobDescriptionProfile || !matchOriginal) {
    throw new Error("INVALID_STATE");
  }
  return { resumeProfile, jobDescriptionProfile, matchOriginal };
}

export type TailorFallback = {
  resumeText: string;
  jdText: string;
  resumeProfile: z.infer<typeof import("@/schemas").ResumeProfileSchema>;
  jobDescriptionProfile: z.infer<
    typeof import("@/schemas").JobDescriptionProfileSchema
  >;
  matchOriginal: z.infer<typeof import("@/schemas").MatchScoreSchema>;
  gapAnalysis: z.infer<typeof import("@/schemas").GapAnalysisSchema>;
};

export async function runTailorPipeline(
  tailoringRunId: string,
  fallback?: TailorFallback
): Promise<TailorPipelineResult> {
  let rec = getRun(tailoringRunId);

  // Serverless fallback: reconstruct the run from client-supplied analyze data
  if (!rec && fallback) {
    console.log(
      `[tailor] Run ${tailoringRunId} not in memory — reconstructing from client fallback (serverless mode).`
    );
    const created = createRun({
      resumeText: fallback.resumeText,
      jdText: fallback.jdText,
    });
    // Override the auto-generated ID with the original one so downstream stays consistent
    created.tailoringRun.id = tailoringRunId;
    getMap().set(tailoringRunId, created);

    patchTailoringRun(tailoringRunId, {
      resumeProfile: fallback.resumeProfile,
      jobDescriptionProfile: fallback.jobDescriptionProfile,
      matchOriginal: fallback.matchOriginal,
      gapAnalysis: fallback.gapAnalysis,
    });
    rec = getRun(tailoringRunId);
  }

  if (!rec) throw new Error("NOT_FOUND");

  const mode = resolveInferenceMode();
  const { resumeProfile, jobDescriptionProfile, matchOriginal } =
    requireAnalyzedRun(rec);

  if (mode === "mock") {
    const tailoredResume = buildMockTailoredResume();
    const matchTailored = buildMockMatchTailored(matchOriginal);
    const gapAnalysis = buildMockGapAnalysis();
    const consistencyReport = checkTailoringConsistency(
      resumeProfile,
      tailoredResume
    );

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

  const combined = await timed(tailoringRunId, "tailor.combined", mode, () =>
    completeJson({
      messages: buildCombinedTailorMessages({ resumeJson, jdJson }),
      schema: CombinedTailorSchema,
      schemaHint: "CombinedTailor",
      preprocess: preprocessCombinedTailor,
    })
  );

  const { tailoredResume, matchTailored, gapAnalysis } = combined;

  const consistencyReport = checkTailoringConsistency(
    resumeProfile,
    tailoredResume
  );

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
