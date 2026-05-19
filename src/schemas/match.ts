import { z } from "zod";

export const MatchScoreSchema = z.object({
  overallScore: z.number().min(0).max(100),
  skillCoverageScore: z.number().min(0).max(100),
  responsibilityAlignmentScore: z.number().min(0).max(100),
  keywordScore: z.number().min(0).max(100),
  seniorityScore: z.number().min(0).max(100),
  criticalMissingRequirements: z.array(z.string()).default([]),
  explanation: z.string().min(1, "Explanation cannot be empty"),
});

export type MatchScore = z.infer<typeof MatchScoreSchema>;
