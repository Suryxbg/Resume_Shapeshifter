import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { resumeHistory } from "@/lib/db/schema";
import { getSessionUserFromRequest } from "@/lib/auth";
import { AnalyzeResponseSchema, TailorResponseSchema } from "@/lib/api/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const rows = await db
      .select()
      .from(resumeHistory)
      .where(and(eq(resumeHistory.id, id), eq(resumeHistory.userId, user.id)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    let runData: {
      resumeText: string;
      jdText: string;
      analyze: unknown;
      tailor: unknown;
    } | null = null;

    if (row.runData) {
      try {
        const parsed = JSON.parse(row.runData) as {
          resumeText: string;
          jdText: string;
          analyze: unknown;
          tailor: unknown;
        };
        const analyze = AnalyzeResponseSchema.safeParse(parsed.analyze);
        const tailor = TailorResponseSchema.safeParse(parsed.tailor);
        if (analyze.success && tailor.success) {
          runData = {
            resumeText: parsed.resumeText,
            jdText: parsed.jdText,
            analyze: analyze.data,
            tailor: tailor.data,
          };
        }
      } catch {
        runData = null;
      }
    }

    return NextResponse.json(
      {
        resume: {
          id: row.id,
          jobTitle: row.jobTitle,
          companyName: row.companyName ?? null,
          atsScore: row.atsScore ?? null,
          tailoringRunId: row.tailoringRunId ?? null,
          originalResumeText: row.originalResumeText,
          jobDescriptionText: row.jobDescriptionText,
          generatedResumeText: row.generatedResumeText,
          runData,
          createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
          updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get resume error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
