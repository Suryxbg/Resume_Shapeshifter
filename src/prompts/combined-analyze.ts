import { TRUTHFULNESS_SYSTEM } from "./truthfulness";

export function buildCombinedAnalyzeMessages(resumeText: string, jdText: string) {
  return [
    { role: "system" as const, content: TRUTHFULNESS_SYSTEM },
    {
      role: "user" as const,
      content: `Analyze the raw resume and job description text provided. You must perform the following tasks:
1. Parse the raw resume text into structured "resumeProfile" JSON. Only include information present in the text.
2. Extract the job description details into structured "jobDescriptionProfile" JSON.
3. Compute a match score between the parsed resume and the job description, producing "matchOriginal" JSON. Refer to the DOMAIN PIVOT & TRANSFERABLE SKILLS EVALUATION RULE below.
4. Perform a gap analysis between the parsed resume and job description, producing "gapAnalysis" JSON.

### DOMAIN PIVOT & TRANSFERABLE SKILLS EVALUATION RULE:
If evaluating a tailored/pivoted resume where the candidate is transitioning between different or opposite industries:
- Score Transferable Capability: Evaluate the match based on transferable skill alignment, execution capability, task organization, and potential suitability, rather than strictly penalizing direct industry-specific years of experience.
- Generous Scoring: Raise match scores generously to reflect transferable competencies.
- Optimistic Explanation: In the "explanation" field, highlight how transferable strengths bridge the domains.

Return a single combined JSON object matching this exact shape:
{
  "resumeProfile": {
    "contact": { "name"?: string, "email"?: string, "phone"?: string, "location"?: string },
    "summary": string,
    "skills": string[],
    "experience": [{ "company": string, "title": string, "startDate": string, "endDate": string, "bullets": string[] }],
    "projects": [],
    "education": [],
    "certifications": []
  },
  "jobDescriptionProfile": {
    "jobTitle": string,
    "company": string,
    "requiredSkills": string[],
    "preferredSkills": string[],
    "responsibilities": string[],
    "qualifications": string[],
    "tools": string[],
    "keywords": string[],
    "seniorityLevel": string,
    "domainSignals": string[]
  },
  "matchOriginal": {
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

Be extremely concise and precise to minimize token consumption. Limit lists (skills, responsibilities, gaps) to the top 3-5 most critical entries.

CRITICAL: All score fields (overallScore, skillCoverageScore, responsibilityAlignmentScore, keywordScore, seniorityScore) MUST be integers between 0 and 100 (e.g., 80, not 0.8).

Resume:
---
${resumeText}
---

Job description:
---
${jdText}
---`,
    },
  ];
}
