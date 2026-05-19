import type { z } from "zod";
import { parseJsonObject } from "@/lib/json-extract";
import { getGroqApiKey, getGroqModel, groqBaseUrl } from "@/lib/llm-config";
import { buildJsonRepairMessages } from "@/prompts/json-repair";

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "LlmError";
  }
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 90_000;

async function groqChatCompletion(messages: ChatMessage[]): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new LlmError(
      "GROQ_API_KEY is not configured. Add it to .env or set LLM_FORCE_MOCK=true.",
      "GROQ_NOT_CONFIGURED"
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${groqBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getGroqModel(),
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const errBody = (await res.json()) as { error?: { message?: string } };
        detail = errBody.error?.message ?? "";
      } catch {
        detail = await res.text().catch(() => "");
      }
      const code =
        res.status === 429
          ? "GROQ_RATE_LIMIT"
          : res.status === 401
            ? "GROQ_UNAUTHORIZED"
            : "GROQ_HTTP_ERROR";
      throw new LlmError(
        detail || `Groq request failed (${res.status})`,
        code,
        res.status
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new LlmError("Empty response from Groq", "GROQ_EMPTY_RESPONSE");
    }
    return content;
  } catch (e) {
    if (e instanceof LlmError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new LlmError("Groq request timed out", "GROQ_TIMEOUT");
    }
    throw new LlmError(
      e instanceof Error ? e.message : "Groq request failed",
      "GROQ_NETWORK"
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function completeJson<T extends z.ZodTypeAny>(input: {
  messages: ChatMessage[];
  schema: T;
  schemaHint: string;
  preprocess?: (raw: unknown) => unknown;
}): Promise<z.infer<T>> {
  let lastRaw = "";
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const messages =
      attempt === 0
        ? input.messages
        : buildJsonRepairMessages(lastRaw, input.schemaHint);

    const text = await groqChatCompletion(messages);
    lastRaw = text;

    try {
      let parsed = parseJsonObject(text);
      if (input.preprocess) parsed = input.preprocess(parsed);
      const result = input.schema.safeParse(parsed);
      if (result.success) return result.data;
      lastError = result.error.message;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "JSON parse failed";
    }
  }

  throw new LlmError(
    `Model output did not match schema after retries: ${lastError}`,
    "LLM_VALIDATION_FAILED"
  );
}
