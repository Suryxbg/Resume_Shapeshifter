"use client";

import type { GapAnalysis as GapAnalysisModel } from "@/schemas";

type GapAnalysisProps = {
  analysis: GapAnalysisModel;
};

const importanceStyles: Record<string, string> = {
  high: "bg-red-100 text-red-900 border-red-200",
  medium: "bg-amber-100 text-amber-900 border-amber-200",
  low: "bg-zinc-100 text-zinc-800 border-zinc-200",
};

export function GapAnalysis({ analysis }: GapAnalysisProps) {
  if (analysis.gaps.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
        No gaps flagged in this mock run.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {analysis.gaps.map((gap) => (
        <li
          key={gap.name}
          className={`rounded-lg border px-4 py-3 text-sm ${importanceStyles[gap.importance] ?? importanceStyles.low}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold">{gap.name}</span>
            <span className="text-xs uppercase tracking-wide opacity-80">
              {gap.importance} priority
            </span>
          </div>
          <p className="mt-2 text-xs opacity-90">
            <span className="font-medium">JD: </span>
            {gap.jdEvidence}
          </p>
          <p className="mt-1 text-xs opacity-90">
            <span className="font-medium">Resume: </span>
            {gap.resumeEvidence}
          </p>
          <p className="mt-2 text-xs leading-relaxed">
            <span className="font-medium">Suggested: </span>
            {gap.suggestedAction}
            {gap.canSafelyAdd
              ? " — add only if factually true."
              : " — do not invent this on the resume."}
          </p>
        </li>
      ))}
    </ul>
  );
}
