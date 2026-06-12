import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { resumeHistory } from "@/lib/db/schema";
import { getSessionUserFromRequest } from "@/lib/auth";
import { SaveResumeRequestSchema } from "@/lib/api/types";
import { assembleGeneratedResumeText } from "@/lib/resume/text";

export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select({
        id: resumeHistory.id,
        jobTitle: resumeHistory.jobTitle,
        companyName: resumeHistory.companyName,
        atsScore: resumeHistory.atsScore,
        tailoringRunId: resumeHistory.tailoringRunId,
        createdAt: resumeHistory.createdAt,
        updatedAt: resumeHistory.updatedAt,
      })
      .from(resumeHistory)
      .where(eq(resumeHistory.userId, user.id))
      .orderBy(desc(resumeHistory.createdAt));

    const items = rows.map((row) => ({
      id: row.id,
      jobTitle: row.jobTitle,
      companyName: row.companyName ?? null,
      atsScore: row.atsScore ?? null,
      tailoringRunId: row.tailoringRunId ?? null,
      createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));

    return NextResponse.json({ resumes: items }, { status: 200 });
  } catch (error) {
    console.error("List resumes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = SaveResumeRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { tailoringRunId, resumeText, jdText, analyze, tailor } = result.data;
    const jobTitle =
      analyze.jobDescriptionProfile.jobTitle?.trim() || "Untitled role";
    const companyName =
      analyze.jobDescriptionProfile.company?.trim() || null;
    const generatedResumeText = assembleGeneratedResumeText(tailor.tailoredResume);
    const atsScore = Math.round(tailor.matchTailored.overallScore);

    const runData = JSON.stringify({
      resumeText,
      jdText,
      analyze,
      tailor,
    });

    const savedId = crypto.randomUUID();

    await db.insert(resumeHistory).values({
      id: savedId,
      userId: user.id,
      jobTitle,
      companyName,
      originalResumeText: resumeText,
      jobDescriptionText: jdText,
      generatedResumeText,
      atsScore,
      tailoringRunId,
      runData,
    });

    return NextResponse.json(
      {
        message: "Resume saved successfully",
        id: savedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Save resume error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
