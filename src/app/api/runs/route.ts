import { NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/api-errors";
import { createRun } from "@/lib/run-store";

const CreateRunBodySchema = z.object({
  resumeText: z.string().trim().min(1, "resumeText cannot be empty"),
  jdText: z.string().trim().min(1, "jdText cannot be empty"),
});

/**
 * POST /api/runs — create an in-memory tailoring run (no LLM).
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

  const parsed = CreateRunBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 422 });
  }

  const { tailoringRun } = createRun(parsed.data);
  return NextResponse.json({ tailoringRun }, { status: 201 });
}
