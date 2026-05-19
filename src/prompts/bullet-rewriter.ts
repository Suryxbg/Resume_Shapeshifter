import { TRUTHFULNESS_SYSTEM } from "./truthfulness";

export function buildBulletRewriterMessages(input: {
  resumeJson: string;
  jdJson: string;
}) {
  return [
    { role: "system" as const, content: TRUTHFULNESS_SYSTEM },
    {
      role: "user" as const,
      content: `Rewrite resume bullets to better align with the job description while staying truthful.

For each bullet you change, include metadata. Do not add new jobs or bullets that are not grounded in the original resume.
riskFlag should be a short warning string if the rewrite might overstate experience, otherwise omit or use empty string.

Return JSON:
{
  "tailoredSummary": string,
  "tailoredSkills": string[],
  "tailoredExperience": [{
    "company": string,
    "title": string,
    "bullets": [{
      "original": string,
      "tailored": string,
      "changeReason": string,
      "keywordsAddressed": string[],
      "confidence": "high" | "medium" | "low",
      "riskFlag": string
    }]
  }]
}

Original resume (JSON):
${input.resumeJson}

Job description (JSON):
${input.jdJson}`,
    },
  ];
}
