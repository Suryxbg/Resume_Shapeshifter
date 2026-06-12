import { NextResponse } from "next/server";
import { createRun, getMap, getRun, patchTailoringRun } from "@/lib/stores/run-store";
import {
  generatePdf,
  buildTailoredResumeHtml,
  buildComparisonHtml,
} from "@/lib/pdf";

import { getClientIp, checkRateLimit } from "@/lib/utils/rate-limit";

// In-memory idempotency cache for the MVP
const idempotencyCache = new Map<
  string,
  { buffer: Buffer; filename: string }
>();

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

  try {
    const body = await request.json();
    const { tailoringRunId, kind, runFallback } = body;

    if (!tailoringRunId || typeof tailoringRunId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid tailoringRunId", code: "INVALID_RUN_ID" },
        { status: 400 }
      );
    }

    if (kind !== "tailored" && kind !== "comparison") {
      return NextResponse.json(
        {
          error: "Invalid export kind. Must be 'tailored' or 'comparison'",
          code: "INVALID_KIND",
        },
        { status: 400 }
      );
    }

    // Fetch run from store
    let runRecord = getRun(tailoringRunId);

    // Serverless fallback: reconstruct the run from client-supplied data
    if (!runRecord && runFallback) {
      console.log(
        `[pdf.api] Run ${tailoringRunId} not in memory — reconstructing from client fallback (serverless mode).`
      );
      const created = createRun({
        resumeText: runFallback.resumeText || "",
        jdText: runFallback.jdText || "",
      });
      created.tailoringRun.id = tailoringRunId;
      getMap().set(tailoringRunId, created);

      patchTailoringRun(tailoringRunId, {
        resumeProfile: runFallback.resumeProfile,
        jobDescriptionProfile: runFallback.jobDescriptionProfile,
        matchOriginal: runFallback.matchOriginal,
        matchTailored: runFallback.matchTailored,
        tailoredResume: runFallback.tailoredResume,
        gapAnalysis: runFallback.gapAnalysis,
        status: "ready_for_export",
      });
      runRecord = getRun(tailoringRunId);
    }

    if (!runRecord) {
      return NextResponse.json(
        {
          error: `Tailoring run not found: ${tailoringRunId}`,
          code: "RUN_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const { tailoringRun } = runRecord;

    // Validate we have tailored data to render
    if (!tailoringRun.tailoredResume) {
      return NextResponse.json(
        {
          error: "Resume tailoring has not been generated yet for this run.",
          code: "TAILORING_NOT_GENERATED",
        },
        { status: 400 }
      );
    }

    // Handle Idempotency-Key header support
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) {
      const cached = idempotencyCache.get(idempotencyKey);
      if (cached) {
        console.log(
          `[pdf.api] Cache hit for Idempotency-Key: ${idempotencyKey}`
        );
        return new Response(new Uint8Array(cached.buffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${cached.filename}"`,
            "Content-Length": cached.buffer.length.toString(),
            "X-Cache": "HIT",
          },
        });
      }
    }

    // Build HTML template based on kind
    let htmlContent = "";
    const filename =
      kind === "tailored" ? "resume_tailored.pdf" : "resume_comparison.pdf";

    if (kind === "tailored") {
      htmlContent = buildTailoredResumeHtml(tailoringRun);
    } else {
      htmlContent = buildComparisonHtml(tailoringRun);
    }

    // Generate PDF buffer
    const pdfBuffer = await generatePdf(htmlContent, kind, tailoringRun);

    // Save to idempotency cache if key is present
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, { buffer: pdfBuffer, filename });
      console.log(
        `[pdf.api] Cached generated PDF for Idempotency-Key: ${idempotencyKey}`
      );
    }

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("[pdf.api] Error exporting PDF:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal PDF engine error";
    return NextResponse.json(
      {
        error: `Failed to export PDF document: ${errorMessage}`,
        code: "EXPORT_ERROR",
      },
      { status: 500 }
    );
  }
}
