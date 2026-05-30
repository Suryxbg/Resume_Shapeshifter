import { NextResponse } from "next/server";
import { TailorRequestSchema, TailorResponseSchema } from "@/lib/api-types";
import { formatZodError } from "@/lib/api-errors";
import { runTailorPipeline, mapTailorError } from "@/lib/pipeline/tailor";

import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/tailor — Groq bullet rewrite + tailored match + gaps (mock fallback without API key).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error:
          "Rate limit exceeded. Please wait a minute before sending another request.",
        code: "RATE_LIMIT_EXCEEDED",
      },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.reset.toString(),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const parsed = TailorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 422 });
  }

  try {
    const result = await runTailorPipeline(parsed.data.tailoringRunId);
    const { inferenceMode, inferenceNotice, ...payload } = result;

    const out = TailorResponseSchema.safeParse(payload);
    if (!out.success) {
      return NextResponse.json(
        {
          error: "Internal response validation error",
          code: "INTERNAL",
          fields: out.error.flatten().fieldErrors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...out.data,
      inferenceMode,
      ...(inferenceNotice ? { inferenceNotice } : {}),
    });
  } catch (e) {
    const { status, body: errBody } = mapTailorError(e);
    return NextResponse.json(errBody, { status });
  }
}
