import { describe, expect, it } from "vitest";
import { createRun, getRun, patchTailoringRun } from "@/lib/run-store";
import {
  buildTailoredResumeHtml,
  buildComparisonHtml,
  getSystemBrowserPath,
  generatePdf,
} from "@/lib/pdf";
import { POST } from "@/app/api/export/pdf/route";

describe("PDF Export Architecture Tests", () => {
  const dummyRun = createRun({
    resumeText: "Original Developer Resume Details",
    jdText: "Target Senior Systems Engineer job description",
  });

  const runId = dummyRun.tailoringRun.id;

  // Fully patch run to have tailored outcomes
  patchTailoringRun(runId, {
    resumeProfile: {
      contact: { Name: "Jane Doe", Email: "jane@doe.com" },
      summary: "Experienced software engineer.",
      skills: ["Rust", "C++"],
      experience: [
        {
          company: "Acme Corp",
          title: "Developer",
          startDate: "2020",
          endDate: "2023",
          bullets: ["Wrote high-throughput services."],
        },
      ],
      projects: [],
      education: [],
      certifications: [],
    },
    jobDescriptionProfile: {
      jobTitle: "Senior Systems Engineer",
      company: "Innovate Ltd",
      requiredSkills: ["Rust", "Systems Design"],
      responsibilities: ["Lead engineering designs"],
      seniorityLevel: "Senior",
    },
    matchOriginal: {
      overallScore: 65,
      skillCoverageScore: 60,
      responsibilityAlignmentScore: 70,
      keywordScore: 65,
      seniorityScore: 80,
      criticalMissingRequirements: [],
      explanation: "Good engineering skills, lacking systems design focus.",
    },
    matchTailored: {
      overallScore: 92,
      skillCoverageScore: 90,
      responsibilityAlignmentScore: 95,
      keywordScore: 92,
      seniorityScore: 90,
      criticalMissingRequirements: [],
      explanation: "Strong structural backend match.",
    },
    tailoredResume: {
      tailoredSummary: "ATS-optimized senior systems builder summary.",
      tailoredSkills: ["Rust", "Systems Design", "C++"],
      tailoredExperience: [
        {
          company: "Acme Corp",
          title: "Developer",
          bullets: [
            {
              original: "Wrote high-throughput services.",
              tailored: "Architected low-latency high-throughput server systems in Rust.",
              changeReason: "Aligned with Systems engineering job criteria.",
              keywordsAddressed: ["Rust"],
              confidence: "high",
            },
          ],
        },
      ],
    },
    gapAnalysis: {
      gaps: [
        {
          name: "Infrastructure",
          importance: "high",
          jdEvidence: "Missing dedicated cloud deployment experience.",
          resumeEvidence: "No cloud experience listed in professional experience.",
          suggestedAction: "Mention local staging on AWS or GCP.",
          canSafelyAdd: false,
        },
      ],
    },
  });

  describe("HTML Templates", () => {
    it("builds clean ATS-friendly resume HTML containing key data", () => {
      const record = getRun(runId);
      expect(record).toBeDefined();

      const html = buildTailoredResumeHtml(record!.tailoringRun);
      expect(html).toContain("Jane Doe");
      expect(html).toContain("ATS-optimized senior systems builder summary.");
      // Verifies original dates start/end lookup matched correctly
      expect(html).toContain("2020 - 2023");
      expect(html).toContain("Architected low-latency high-throughput server systems in Rust.");
    });

    it("builds rich Side-by-Side comparison HTML report containing key sections", () => {
      const record = getRun(runId);
      expect(record).toBeDefined();

      const html = buildComparisonHtml(record!.tailoringRun);
      expect(html).toContain("Resume Tailoring Comparison & Insights");
      expect(html).toContain("65%");
      expect(html).toContain("max-width: 900px;");
      expect(html).toContain("Wrote high-throughput services.");
      expect(html).toContain("Architected low-latency high-throughput server systems in Rust.");
      expect(html).toContain("Disclaimer");
    });
  });

  describe("PDF Engine & Resolution", () => {
    it("resolves a local Chrome or Edge path or safely returns null", () => {
      const path = getSystemBrowserPath();
      if (path) {
        expect(typeof path).toBe("string");
        expect(path.length).toBeGreaterThan(0);
      } else {
        expect(path).toBeNull();
      }
    });

    it("falls back gracefully in mock/test mode to a mock string PDF", async () => {
      const html = "<html><body>Test</body></html>";
      const buffer = await generatePdf(html);
      expect(buffer.toString()).toContain("Mock PDF Generated Successfully");
    });
  });

  describe("API POST /api/export/pdf Endpoints", () => {
    it("returns 400 on missing tailoringRunId payload", async () => {
      const req = new Request("http://localhost/api/export/pdf", {
        method: "POST",
        body: JSON.stringify({ kind: "tailored" }),
      });
      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_RUN_ID");
    });

    it("returns 400 on invalid export kind", async () => {
      const req = new Request("http://localhost/api/export/pdf", {
        method: "POST",
        body: JSON.stringify({ tailoringRunId: runId, kind: "invalid-value" }),
      });
      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_KIND");
    });

    it("returns 404 on non-existent run ID", async () => {
      const fakeUuid = "00000000-0000-0000-0000-000000000000";
      const req = new Request("http://localhost/api/export/pdf", {
        method: "POST",
        body: JSON.stringify({ tailoringRunId: fakeUuid, kind: "tailored" }),
      });
      const response = await POST(req);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe("RUN_NOT_FOUND");
    });

    it("returns 200 and supports cached data on Idempotency-Key match", async () => {
      const idempotencyKey = `key-test-${runId}`;

      const req1 = new Request("http://localhost/api/export/pdf", {
        method: "POST",
        headers: { "idempotency-key": idempotencyKey },
        body: JSON.stringify({ tailoringRunId: runId, kind: "tailored" }),
      });

      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      expect(res1.headers.get("X-Cache")).toBe("MISS");
      expect(res1.headers.get("Content-Type")).toBe("application/pdf");

      const req2 = new Request("http://localhost/api/export/pdf", {
        method: "POST",
        headers: { "idempotency-key": idempotencyKey },
        body: JSON.stringify({ tailoringRunId: runId, kind: "tailored" }),
      });

      const res2 = await POST(req2);
      expect(res2.status).toBe(200);
      expect(res2.headers.get("X-Cache")).toBe("HIT");
    });
  });
});
