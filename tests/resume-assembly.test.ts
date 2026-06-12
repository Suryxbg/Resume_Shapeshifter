import { describe, expect, it } from "vitest";
import { assembleResumeForScoring } from "@/lib/resume/assembly";
import resumeFixture from "./fixtures/resume-profile.json";
import tailoredFixture from "./fixtures/tailored-resume.json";
import type { ResumeProfile } from "@/schemas";
import type { TailoredResume } from "@/schemas";

describe("assembleResumeForScoring", () => {
  it("uses tailored bullets and summary while keeping original contact", () => {
    const original = resumeFixture as ResumeProfile;
    const tailored = tailoredFixture as TailoredResume;
    const assembled = assembleResumeForScoring(original, tailored);

    expect(assembled.contact).toEqual(original.contact);
    expect(assembled.summary).toBe(tailored.tailoredSummary);
    expect(assembled.experience[0]?.bullets[0]).toBe(
      tailored.tailoredExperience[0]?.bullets[0]?.tailored
    );
    expect(assembled.experience.length).toBe(original.experience.length);
  });
});
