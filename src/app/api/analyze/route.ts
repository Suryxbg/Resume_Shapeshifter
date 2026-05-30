import { NextResponse } from "next/server";
import { AnalyzeRequestSchema, AnalyzeResponseSchema } from "@/lib/api-types";
import { formatZodError } from "@/lib/api-errors";
import { runAnalyzePipeline } from "@/lib/pipeline/analyze";
import { mapPipelineError } from "@/lib/pipeline/errors";

import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/analyze — JD + resume analysis via Groq, or mock fallback when GROQ_API_KEY is unset.
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

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 422 });
  }

  try {
    const result = await runAnalyzePipeline(parsed.data);
    const { inferenceMode, inferenceNotice, ...payload } = result;

    const out = AnalyzeResponseSchema.safeParse(payload);
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
    const { status, body: errBody } = mapPipelineError(e);
    return NextResponse.json(errBody, { status });
  }
}
