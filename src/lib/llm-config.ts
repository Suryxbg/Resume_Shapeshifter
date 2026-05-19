export type InferenceMode = "groq" | "mock";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function getGroqApiKey(): string | undefined {
  const key = process.env.GROQ_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

/** When true, skip Groq and use Phase 1 fixture builders (dev without API key). */
export function isMockInferenceForced(): boolean {
  return process.env.LLM_FORCE_MOCK === "true" || process.env.LLM_FORCE_MOCK === "1";
}

export function resolveInferenceMode(): InferenceMode {
  if (isMockInferenceForced()) return "mock";
  if (!getGroqApiKey()) return "mock";
  return "groq";
}

export function groqBaseUrl(): string {
  return "https://api.groq.com/openai/v1";
}
