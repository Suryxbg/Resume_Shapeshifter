import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  GapAnalysisSchema,
  JobDescriptionProfileSchema,
  MatchScoreSchema,
  ResumeProfileSchema,
  TailoredResumeSchema,
  TailoringRunSchema,
} from "@/schemas";

const here = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): unknown {
  const raw = readFileSync(join(here, "fixtures", name), "utf-8");
  return JSON.parse(raw) as unknown;
}

describe("golden fixtures validate against Zod schemas", () => {
  it("resume-profile.json → ResumeProfileSchema", () => {
    const r = ResumeProfileSchema.safeParse(loadFixture("resume-profile.json"));
    expect(r.success).toBe(true);
  });

  it("job-description-profile.json → JobDescriptionProfileSchema", () => {
    const r = JobDescriptionProfileSchema.safeParse(
      loadFixture("job-description-profile.json")
    );
    expect(r.success).toBe(true);
  });

  it("match-score.json → MatchScoreSchema", () => {
    const r = MatchScoreSchema.safeParse(loadFixture("match-score.json"));
    expect(r.success).toBe(true);
  });

  it("tailored-resume.json → TailoredResumeSchema", () => {
    const r = TailoredResumeSchema.safeParse(loadFixture("tailored-resume.json"));
    expect(r.success).toBe(true);
  });

  it("gap-analysis.json → GapAnalysisSchema", () => {
    const r = GapAnalysisSchema.safeParse(loadFixture("gap-analysis.json"));
    expect(r.success).toBe(true);
  });

  it("tailoring-run.json → TailoringRunSchema", () => {
    const r = TailoringRunSchema.safeParse(loadFixture("tailoring-run.json"));
    expect(r.success).toBe(true);
  });
});
