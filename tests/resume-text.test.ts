import { describe, expect, it } from "vitest";
import { assembleGeneratedResumeText } from "@/lib/resume/text";
import type { TailoredResume } from "@/schemas";

const sampleTailored: TailoredResume = {
  tailoredSummary: "Experienced engineer focused on scalable systems.",
  tailoredSkills: ["TypeScript", "React", "Node.js"],
  tailoredExperience: [
    {
      company: "Acme Corp",
      title: "Software Engineer",
      bullets: [
        {
          original: "Built APIs",
          tailored: "Built scalable REST APIs serving 1M+ requests/day",
          changeReason: "Added impact",
          keywordsAddressed: ["API"],
          confidence: "high",
        },
      ],
    },
  ],
};

describe("assembleGeneratedResumeText", () => {
  it("assembles summary, skills, and tailored bullets", () => {
    const text = assembleGeneratedResumeText(sampleTailored);
    expect(text).toContain("SUMMARY");
    expect(text).toContain(sampleTailored.tailoredSummary);
    expect(text).toContain("SKILLS");
    expect(text).toContain("TypeScript");
    expect(text).toContain("Software Engineer — Acme Corp");
    expect(text).toContain("Built scalable REST APIs");
  });
});
