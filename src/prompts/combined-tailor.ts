import { TRUTHFULNESS_SYSTEM } from "./truthfulness";

export function buildCombinedTailorMessages(input: {
  resumeJson: string;
  jdJson: string;
}) {
  return [
    { role: "system" as const, content: TRUTHFULNESS_SYSTEM },
    {
      role: "user" as const,
      content: `You are Resume Shapeshifter. Rewrite the resume summary, skills, and experience bullets to better align with the job description while staying strictly truthful.
Also, perform the following tasks:
1. Compute the new tailored match score for the tailored resume against the job description. Refer to the DOMAIN PIVOT & TRANSFERABLE SKILLS EVALUATION RULE below.
2. Generate the gap analysis for the tailored resume.

### DOMAIN PIVOT & TRANSFERABLE SKILLS EVALUATION RULE:
If evaluating a tailored/pivoted resume where the candidate is transitioning between different or opposite industries:
- Score Transferable Capability: Evaluate the match based on transferable skill alignment, execution capability, task organization, and potential suitability, rather than strictly penalizing direct industry-specific years of experience.
- Generous Scoring: Raise match scores generously to reflect transferable competencies.
- Optimistic Explanation: In the "explanation" field, highlight how transferable strengths bridge the domains.

Return a single combined JSON object matching this exact shape:
{
  "tailoredResume": {
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
  },
  "matchTailored": {
    "overallScore": number,
    "skillCoverageScore": number,
    "responsibilityAlignmentScore": number,
    "keywordScore": number,
    "seniorityScore": number,
    "criticalMissingRequirements": string[],
    "explanation": string
  },
  "gapAnalysis": {
    "gaps": [{
      "name": string,
      "importance": "high" | "medium" | "low",
      "jdEvidence": string,
      "resumeEvidence": string,
      "suggestedAction": string,
      "canSafelyAdd": boolean
    }]
  }
}

Be extremely concise and precise to minimize token consumption. Limit the experience bullets to the top 2-3 most impactful bullets per job (and only rewrite those). Keep explanations and change reasons short.

CRITICAL: All score fields (overallScore, skillCoverageScore, responsibilityAlignmentScore, keywordScore, seniorityScore) MUST be integers between 0 and 100 (e.g., 85, not 0.85).

Original resume (JSON):
${input.resumeJson}

Job description (JSON):
${input.jdJson}`,
    },
  ];
}
