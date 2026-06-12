import { NextResponse } from "next/server";
import { getRun } from "@/lib/stores/run-store";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/runs/[id] — fetch a tailoring run envelope from the in-memory store.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = getRun(id);
  if (!record) {
    return NextResponse.json(
      { error: "Run not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    tailoringRun: record.tailoringRun,
    /** Plaintext exists in store for upcoming phases; omitted from body by default. */
    stagedInputAvailable: true,
  });
}
