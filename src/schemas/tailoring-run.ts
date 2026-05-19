import { z } from "zod";
import { GapAnalysisSchema } from "./gaps";
import { JobDescriptionProfileSchema } from "./jd";
import { MatchScoreSchema } from "./match";
import { ResumeProfileSchema } from "./resume";
import { TailoredResumeSchema } from "./tailored";

export const TailoringRunStatusSchema = z.enum([
  "draft",
  "ready_for_export",
  "exported",
]);

export const ConsistencyReportSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  hallucinatedCompanies: z.array(z.string()).default([]),
  hallucinatedBullets: z.array(z.string()).default([]),
});

export type ConsistencyReport = z.infer<typeof ConsistencyReportSchema>;

/**
 * Canonical envelope for a tailoring session (architecture.md §5.6).
 * Optional snapshots fill in as the pipeline progresses.
 */
export const TailoringRunSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().min(1),
  userId: z.string().optional(),
  resumeSourceRef: z.string().optional(),
  jdTextHash: z.string().optional(),
  resumeProfile: ResumeProfileSchema.optional(),
  jobDescriptionProfile: JobDescriptionProfileSchema.optional(),
  matchOriginal: MatchScoreSchema.optional(),
  matchTailored: MatchScoreSchema.optional(),
  tailoredResume: TailoredResumeSchema.optional(),
  gapAnalysis: GapAnalysisSchema.optional(),
  consistencyReport: ConsistencyReportSchema.optional(),
  status: TailoringRunStatusSchema,
});

export type TailoringRun = z.infer<typeof TailoringRunSchema>;
