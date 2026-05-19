export type PipelineStage =
  | "analyze.jd"
  | "analyze.resume"
  | "analyze.match"
  | "analyze.gaps"
  | "tailor.rewrite"
  | "tailor.match"
  | "tailor.gaps";

export function logPipelineStage(input: {
  tailoringRunId: string;
  stage: PipelineStage;
  ok: boolean;
  durationMs: number;
  inferenceMode: "groq" | "mock";
  errorCode?: string;
}) {
  const payload = {
    tailoringRunId: input.tailoringRunId,
    stage: input.stage,
    ok: input.ok,
    durationMs: input.durationMs,
    inferenceMode: input.inferenceMode,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
  };
  if (input.ok) {
    console.info("[pipeline]", JSON.stringify(payload));
  } else {
    console.warn("[pipeline]", JSON.stringify(payload));
  }
}
