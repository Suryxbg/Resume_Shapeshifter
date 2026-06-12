/** Coerce numeric score fields when the model returns strings. */
export function preprocessMatchScore(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  const keys = [
    "overallScore",
    "skillCoverageScore",
    "responsibilityAlignmentScore",
    "keywordScore",
    "seniorityScore",
  ] as const;
  for (const k of keys) {
    if (typeof o[k] === "string") {
      const n = Number(o[k]);
      if (!Number.isNaN(n)) o[k] = n;
    }
    if (typeof o[k] === "number" && o[k] > 0 && o[k] <= 1.0) {
      o[k] = Math.round(o[k] * 100);
    }
  }
  return o;
}

/** Normalize empty riskFlag to undefined for Zod optional field. */
export function preprocessTailoredResume(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const o = structuredClone(raw) as {
    tailoredExperience?: {
      bullets?: { riskFlag?: string }[];
    }[];
  };
  for (const exp of o.tailoredExperience ?? []) {
    for (const b of exp.bullets ?? []) {
      if (b.riskFlag === "") delete b.riskFlag;
    }
  }
  return o;
}
