import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkTailoringConsistency } from "@/lib/consistency";
import { ResumeProfile } from "@/schemas/resume";
import { TailoredResume } from "@/schemas/tailored";

describe("Guardrails and Rate-Limiter Tests", () => {
  describe("API IP Rate Limiting Utility", () => {
    it("allows requests below the limit and rate-limits on the 11th request", () => {
      const ip = "192.168.1.50";

      // Call 10 times — all should be successful
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(ip);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(10 - (i + 1));
      }

      // 11th call should fail
      const failedResult = checkRateLimit(ip);
      expect(failedResult.success).toBe(false);
      expect(failedResult.remaining).toBe(0);
    });
  });

  describe("Server-Side Post-LLM Consistency Engine", () => {
    const originalProfile: ResumeProfile = {
      contact: { Name: "Jane Doe" },
      summary: "Developer profile.",
      skills: ["TypeScript", "Next.js"],
      experience: [
        {
          company: "Innovate Corp",
          title: "Engineer",
          bullets: ["Wrote clean React code."],
        },
      ],
      projects: [],
      education: [],
      certifications: [],
    };

    it("passes consistency check when tailored experience matches original structure", () => {
      const matchingTailored: TailoredResume = {
        tailoredSummary: "Strong tailored summary.",
        tailoredSkills: ["TypeScript", "Next.js", "React"],
        tailoredExperience: [
          {
            company: "Innovate Corp",
            title: "Engineer",
            bullets: [
              {
                original: "Wrote clean React code.",
                tailored: "Crafted high-fidelity React UI components.",
                changeReason: "Aligned with UI design criteria.",
                keywordsAddressed: ["React"],
                confidence: "high",
              },
            ],
          },
        ],
      };

      const report = checkTailoringConsistency(
        originalProfile,
        matchingTailored
      );
      expect(report.isValid).toBe(true);
      expect(report.errors.length).toBe(0);
    });

    it("flags invented employers/companies with clear errors", () => {
      const hallucinatedEmployer: TailoredResume = {
        tailoredSummary: "Mismatched summary.",
        tailoredSkills: ["React"],
        tailoredExperience: [
          {
            company: "Invented Global Tech",
            title: "Architect",
            bullets: [
              {
                original: "Non-existent bullet.",
                tailored: "Architected modern cloud solutions.",
                changeReason:
                  "Aligned with cloud systems engineering criteria.",
                keywordsAddressed: ["cloud"],
                confidence: "medium",
              },
            ],
          },
        ],
      };

      const report = checkTailoringConsistency(
        originalProfile,
        hallucinatedEmployer
      );
      expect(report.isValid).toBe(false);
      expect(report.errors[0]).toContain("Invented Employer Found");
      expect(report.hallucinatedCompanies).toContain("Invented Global Tech");
    });

    it("flags fabricated or unsanctioned bullet points", () => {
      const hallucinatedBullet: TailoredResume = {
        tailoredSummary: "Summary",
        tailoredSkills: [],
        tailoredExperience: [
          {
            company: "Innovate Corp",
            title: "Engineer",
            bullets: [
              {
                original: "Fabricated original bullet details.",
                tailored: "Improved pipeline compilation times by 50%.",
                changeReason: "Aligned with performance optimization criteria.",
                keywordsAddressed: [],
                confidence: "high",
              },
            ],
          },
        ],
      };

      const report = checkTailoringConsistency(
        originalProfile,
        hallucinatedBullet
      );
      expect(report.isValid).toBe(false);
      expect(report.errors[0]).toContain("Unsanctioned Bullet Point");
      expect(report.hallucinatedBullets).toContain(
        "Fabricated original bullet details."
      );
    });
  });
});
