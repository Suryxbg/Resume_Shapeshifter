"use client";

import { Fragment } from "react";
import type { ResumeProfile } from "@/schemas";
import type { TailoredResume } from "@/schemas";

type SideBySideDiffProps = {
  resume: ResumeProfile;
  tailored: TailoredResume;
};

export function SideBySideDiff({ resume, tailored }: SideBySideDiffProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="w-[36%] px-3 py-2 font-semibold text-zinc-700">
              Original
            </th>
            <th className="w-[36%] px-3 py-2 font-semibold text-zinc-700">
              Tailored
            </th>
            <th className="w-[28%] px-3 py-2 font-semibold text-zinc-700">
              Why / meta
            </th>
          </tr>
        </thead>
        <tbody>
          {tailored.tailoredExperience.map((tExp, expIdx) => {
            const origExp = resume.experience[expIdx];
            const header = origExp
              ? `${origExp.title} · ${origExp.company}`
              : `${tExp.title} · ${tExp.company}`;
            return (
              <Fragment key={expIdx}>
                <tr className="bg-zinc-100">
                  <td
                    colSpan={3}
                    className="px-3 py-2 text-xs font-semibold text-zinc-700"
                  >
                    {header}
                  </td>
                </tr>
                {tExp.bullets.map((b, i) => (
                  <tr
                    key={`${expIdx}-${i}`}
                    className="border-b border-zinc-100 align-top"
                  >
                    <td className="px-3 py-2 text-zinc-800">{b.original}</td>
                    <td className="px-3 py-2 text-zinc-900">
                      <span className="rounded bg-emerald-50 px-1 text-emerald-950">
                        {b.tailored}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600">
                      <p>{b.changeReason}</p>
                      <p className="mt-1">
                        <span className="font-medium text-zinc-700">
                          Keywords:{" "}
                        </span>
                        {b.keywordsAddressed.join(", ") || "—"}
                      </p>
                      <p className="mt-1">
                        <span className="font-medium text-zinc-700">
                          Confidence:{" "}
                        </span>
                        {b.confidence}
                        {b.riskFlag ? (
                          <>
                            {" "}
                            ·{" "}
                            <span className="text-amber-800">{b.riskFlag}</span>
                          </>
                        ) : null}
                      </p>
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
