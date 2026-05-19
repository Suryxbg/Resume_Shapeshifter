import { TRUTHFULNESS_SYSTEM } from "./truthfulness";

export function buildMatchScoringMessages(input: {
  resumeJson: string;
  jdJson: string;
  label: string;
}) {
  return [
    { role: "system" as const, content: TRUTHFULNESS_SYSTEM },
    {
      role: "user" as const,
      content: `You are an expert resume-to-JD match evaluation engine. Score how well this resume matches the job description. Label this evaluation: "${input.label}".

### DOMAIN PIVOT & TRANSFERABLE SKILLS EVALUATION RULE:
If evaluating a tailored/pivoted resume where the candidate is transitioning between different or opposite industries (e.g. Software Developer to Head Chef, or Engineer to Sales):
1. **Score Transferable Capability**: Evaluate the match based on the **transferable skill alignment, execution capability, task organization, and potential suitability** shown in the tailored experiences, rather than strictly penalizing the lack of direct industry-specific years of experience.
2. **Generous Scoring**: Raise the match scores (overallScore, skillCoverageScore, responsibilityAlignmentScore, keywordScore) generously to reflect the strength of the adapted/pivoted bullets and transferable competencies, rather than giving a low or zero score. A well-pivoted resume should score significantly higher than the original un-tailored resume (e.g. 50-80% overall depending on pivot alignment).
3. **Optimistic Explanation**: In the "explanation" field, highlight how their transferable strengths bridge the two domains and how the changes made help them fit the target role.

Scores must be integers 0-100 for: overallScore, skillCoverageScore, responsibilityAlignmentScore, keywordScore, seniorityScore.
List criticalMissingRequirements as strings (empty array if none).

Return JSON format:
{
  "overallScore": number,
  "skillCoverageScore": number,
  "responsibilityAlignmentScore": number,
  "keywordScore": number,
  "seniorityScore": number,
  "criticalMissingRequirements": string[],
  "explanation": "A positive explanation highlighting their transferable skills and how the tailoring successfully bridges the gap between the two domains."
}

Resume (JSON):
${input.resumeJson}

Job description (JSON):
${input.jdJson}`,
    },
  ];
}
