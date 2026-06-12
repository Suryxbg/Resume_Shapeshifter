import { redirect, notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { SavedResumeDetail } from "@/components/resumes/SavedResumeDetail";
import { getSessionUser } from "@/lib/auth";
import {
  AnalyzeResponseSchema,
  TailorResponseSchema,
  type ResumeHistoryDetail,
} from "@/lib/api/types";
import { db } from "@/lib/db";
import { resumeHistory } from "@/lib/db/schema";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResumeDetailPage({ params }: PageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/resumes");
  }

  const { id } = await params;

  const rows = await db
    .select()
    .from(resumeHistory)
    .where(and(eq(resumeHistory.id, id), eq(resumeHistory.userId, user.id)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    notFound();
  }

  let runData: ResumeHistoryDetail["runData"] = null;
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

  const resume: ResumeHistoryDetail = {
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
  };

  return <SavedResumeDetail resume={resume} />;
}
