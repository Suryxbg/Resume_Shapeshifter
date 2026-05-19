import type { GapAnalysis } from "@/schemas/gaps";
import type { JobDescriptionProfile } from "@/schemas/jd";
import type { MatchScore } from "@/schemas/match";
import type { ResumeProfile } from "@/schemas/resume";
import type { TailoredResume } from "@/schemas/tailored";
import gapAnalysisFixture from "../../tests/fixtures/gap-analysis.json";
import jobDescriptionFixture from "../../tests/fixtures/job-description-profile.json";
import matchScoreFixture from "../../tests/fixtures/match-score.json";
import resumeProfileFixture from "../../tests/fixtures/resume-profile.json";
import tailoredResumeFixture from "../../tests/fixtures/tailored-resume.json";

function clone<T>(v: T): T {
  return structuredClone(v) as T;
}

/** First non-empty line of pasted text (for light mock personalization). */
function headLine(text: string): string | undefined {
  const line = text
    .trim()
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find(Boolean);
  return line && line.length > 0 ? line : undefined;
}

export function buildMockResumeProfile(resumeText: string): ResumeProfile {
  const base = clone(resumeProfileFixture) as ResumeProfile;
  const hint = headLine(resumeText);
  if (hint) {
    const suffix = hint.length > 100 ? `${hint.slice(0, 100)}…` : hint;
    base.summary = `${base.summary} (Mock preview from your paste: ${suffix})`;
  }
  return base;
}

export function buildMockJobDescriptionProfile(jdText: string): JobDescriptionProfile {
  const base = clone(jobDescriptionFixture) as JobDescriptionProfile;
  const hint = headLine(jdText);
  if (hint && hint.length < 120) {
    base.jobTitle = hint;
  }
  return base;
}

export function buildMockMatchOriginal(): MatchScore {
  return clone(matchScoreFixture) as MatchScore;
}

/** Mock “after tailor” score — deterministic bump, still valid 0–100. */
export function buildMockMatchTailored(original: MatchScore): MatchScore {
  const bump = (n: number, d: number) => Math.min(100, Math.max(0, Math.round(n + d)));
  return {
    overallScore: bump(original.overallScore, 11),
    skillCoverageScore: bump(original.skillCoverageScore, 8),
    responsibilityAlignmentScore: bump(original.responsibilityAlignmentScore, 10),
    keywordScore: bump(original.keywordScore, 12),
    seniorityScore: bump(original.seniorityScore, 3),
    criticalMissingRequirements: original.criticalMissingRequirements.slice(0, 1),
    explanation: `${original.explanation} After tailoring (mock): alignment improves on keywords and responsibilities; gaps may remain where the JD requires experience you have not listed.`,
  };
}

export function buildMockGapAnalysis(): GapAnalysis {
  return clone(gapAnalysisFixture) as GapAnalysis;
}

export function buildMockTailoredResume(): TailoredResume {
  return clone(tailoredResumeFixture) as TailoredResume;
}
