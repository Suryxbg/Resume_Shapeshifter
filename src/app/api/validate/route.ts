import { NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/api-errors";
import {
  GapAnalysisSchema,
  JobDescriptionProfileSchema,
  MatchScoreSchema,
  ResumeProfileSchema,
  TailoredResumeSchema,
  TailoringRunSchema,
} from "@/schemas";

const ValidateBodySchema = z.object({
  schema: z.enum([
    "resumeProfile",
    "jobDescriptionProfile",
    "matchScore",
    "tailoredResume",
    "gapAnalysis",
    "tailoringRun",
  ]),
  payload: z.unknown(),
});

const parsers = {
  resumeProfile: ResumeProfileSchema,
  jobDescriptionProfile: JobDescriptionProfileSchema,
  matchScore: MatchScoreSchema,
  tailoredResume: TailoredResumeSchema,
  gapAnalysis: GapAnalysisSchema,
  tailoringRun: TailoringRunSchema,
} as const;

/**
 * POST /api/validate — validates a JSON payload against a named schema (Phase 0 shell).
 * Returns 422 with stable error shape on failure (implementation-plan Phase 0).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const parsedBody = ValidateBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(formatZodError(parsedBody.error), { status: 422 });
  }

  const { schema, payload } = parsedBody.data;
  const result = parsers[schema].safeParse(payload);
  if (!result.success) {
    return NextResponse.json(formatZodError(result.error), { status: 422 });
  }

  return NextResponse.json({ valid: true, schema });
}
