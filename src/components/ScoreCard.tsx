"use client";

import type { MatchScore } from "@/schemas";

type ScoreCardProps = {
  title: string;
  score: MatchScore;
};

export function ScoreCard({ title, score }: ScoreCardProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title} — Heuristic Match Score
      </h3>
      <p className="mt-2 text-4xl font-semibold tabular-nums text-zinc-900">
        {score.overallScore}
        <span className="text-lg font-normal text-zinc-500">/100</span>
      </p>
      <p className="mt-1.5 text-[11px] leading-normal text-zinc-400 italic">
        * Heuristic analysis estimate based on semantic skill coverage, keyword density, seniority level matching, and target JD responsibility overlap.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Skills</dt>
          <dd className="font-medium tabular-nums">{score.skillCoverageScore}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Responsibilities</dt>
          <dd className="font-medium tabular-nums">
            {score.responsibilityAlignmentScore}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Keywords</dt>
          <dd className="font-medium tabular-nums">{score.keywordScore}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Seniority</dt>
          <dd className="font-medium tabular-nums">{score.seniorityScore}</dd>
        </div>
      </dl>
      {score.criticalMissingRequirements.length > 0 && (
        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-medium">Critical gaps: </span>
          {score.criticalMissingRequirements.join(" · ")}
        </div>
      )}
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{score.explanation}</p>
    </section>
  );
}
