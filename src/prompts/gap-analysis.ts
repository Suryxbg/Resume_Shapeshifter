import { TRUTHFULNESS_SYSTEM } from "./truthfulness";

export function buildGapAnalysisMessages(input: {
  resumeJson: string;
  jdJson: string;
}) {
  return [
    { role: "system" as const, content: TRUTHFULNESS_SYSTEM },
    {
      role: "user" as const,
      content: `Compare the resume to the job description and list gaps.

importance must be "high", "medium", or "low".
canSafelyAdd is true only if the candidate could truthfully add the item without inventing experience.

Return JSON:
{
  "gaps": [{
    "name": string,
    "importance": "high" | "medium" | "low",
    "jdEvidence": string,
    "resumeEvidence": string,
    "suggestedAction": string,
    "canSafelyAdd": boolean
  }]
}

Resume (JSON):
${input.resumeJson}

Job description (JSON):
${input.jdJson}`,
    },
  ];
}
