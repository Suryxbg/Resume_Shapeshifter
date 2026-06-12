"use client";

import Link from "next/link";
import { PDFExportButton } from "@/components/tool/PDFExportButton";
import { ScoreCard } from "@/components/tool/ScoreCard";
import { SideBySideDiff } from "@/components/tool/SideBySideDiff";
import type { ResumeHistoryDetail } from "@/lib/api/types";

export function SavedResumeDetail({ resume }: { resume: ResumeHistoryDetail }) {
  const runData = resume.runData;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <Link
          href="/resumes"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back to My Resumes
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {resume.jobTitle}
        </h1>
        {resume.companyName ? (
          <p className="mt-1 text-sm text-zinc-600">{resume.companyName}</p>
        ) : null}
        <p className="mt-1 text-xs text-zinc-500">
          Saved {new Date(resume.createdAt).toLocaleString()}
        </p>
      </div>

      {runData ? (
        <section className="flex flex-col gap-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <ScoreCard title="Original match" score={runData.analyze.matchOriginal} />
            <ScoreCard title="Tailored match" score={runData.tailor.matchTailored} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Tailored summary
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-800">
              {runData.tailor.tailoredResume.tailoredSummary}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Bullets — original vs tailored
            </h2>
            <div className="mt-3">
              <SideBySideDiff
                resume={runData.analyze.resumeProfile}
                tailored={runData.tailor.tailoredResume}
              />
            </div>
          </div>

          {resume.tailoringRunId ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <PDFExportButton
                label="ATS-Tailored Resume PDF"
                description="Download the tailored resume PDF for this saved session."
                tailoringRunId={resume.tailoringRunId}
                kind="tailored"
                runFallback={{
                  resumeText: runData.resumeText,
                  jdText: runData.jdText,
                  resumeProfile: runData.analyze.resumeProfile,
                  jobDescriptionProfile: runData.analyze.jobDescriptionProfile,
                  matchOriginal: runData.analyze.matchOriginal,
                  matchTailored: runData.tailor.matchTailored,
                  tailoredResume: runData.tailor.tailoredResume,
                  gapAnalysis: runData.tailor.gapAnalysis,
                }}
              />
              <PDFExportButton
                label="Side-by-Side Comparison PDF"
                description="Download the comparison audit PDF for this saved session."
                tailoringRunId={resume.tailoringRunId}
                kind="comparison"
                runFallback={{
                  resumeText: runData.resumeText,
                  jdText: runData.jdText,
                  resumeProfile: runData.analyze.resumeProfile,
                  jobDescriptionProfile: runData.analyze.jobDescriptionProfile,
                  matchOriginal: runData.analyze.matchOriginal,
                  matchTailored: runData.tailor.matchTailored,
                  tailoredResume: runData.tailor.tailoredResume,
                  gapAnalysis: runData.tailor.gapAnalysis,
                }}
              />
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Generated resume text
          </h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
            {resume.generatedResumeText}
          </pre>
        </section>
      )}
    </main>
  );
}
