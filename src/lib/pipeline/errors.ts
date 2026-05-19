import { LlmError } from "@/lib/llm";

export function mapPipelineError(e: unknown): { status: number; body: object } {
  if (e instanceof LlmError) {
    const status =
      e.code === "GROQ_RATE_LIMIT"
        ? 429
        : e.code === "GROQ_UNAUTHORIZED"
          ? 401
          : e.code === "GROQ_NOT_CONFIGURED"
            ? 503
            : e.code === "GROQ_TIMEOUT"
              ? 504
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
      error: e instanceof Error ? e.message : "Request failed",
      code: "INTERNAL",
    },
  };
}
