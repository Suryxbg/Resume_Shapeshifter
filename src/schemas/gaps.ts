import { z } from "zod";

export const GapImportanceSchema = z.enum(["high", "medium", "low"]);

export const ResumeGapSchema = z.object({
  name: z.string().min(1, "Gap name cannot be empty"),
  importance: GapImportanceSchema,
  jdEvidence: z.string(),
  resumeEvidence: z.string(),
  suggestedAction: z.string().min(1, "Suggested action cannot be empty"),
  canSafelyAdd: z.boolean(),
});

export const GapAnalysisSchema = z.object({
  gaps: z.array(ResumeGapSchema).default([]),
});

export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;
export type ResumeGap = z.infer<typeof ResumeGapSchema>;
