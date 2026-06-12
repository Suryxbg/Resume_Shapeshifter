import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveInferenceMode } from "@/lib/llm/config";

describe("resolveInferenceMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns mock when GROQ_API_KEY is unset", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("LLM_FORCE_MOCK", "");
    expect(resolveInferenceMode()).toBe("mock");
  });

  it("returns groq when key is set", () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("LLM_FORCE_MOCK", "");
    expect(resolveInferenceMode()).toBe("groq");
  });

  it("returns mock when LLM_FORCE_MOCK is true", () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("LLM_FORCE_MOCK", "true");
    expect(resolveInferenceMode()).toBe("mock");
  });
});
