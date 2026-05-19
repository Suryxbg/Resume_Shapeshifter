import { z } from "zod";
import {
  GapAnalysisSchema,
  JobDescriptionProfileSchema,
  MatchScoreSchema,
  ResumeProfileSchema,
  TailoredResumeSchema,
  ConsistencyReportSchema,
} from "@/schemas";

export const AnalyzeRequestSchema = z.object({
  resumeText: z.string().trim().min(1, "resumeText cannot be empty"),
  jdText: z.string().trim().min(1, "jdText cannot be empty"),
});

export const InferenceModeSchema = z.enum(["groq", "mock"]);

export const AnalyzeResponseSchema = z.object({
  tailoringRunId: z.string().uuid(),
  resumeProfile: ResumeProfileSchema,
  jobDescriptionProfile: JobDescriptionProfileSchema,
  matchOriginal: MatchScoreSchema,
  gapAnalysis: GapAnalysisSchema,
  inferenceMode: InferenceModeSchema.optional(),
  inferenceNotice: z.string().optional(),
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

export const TailorRequestSchema = z.object({
  tailoringRunId: z.string().uuid(),
});

export const TailorResponseSchema = z.object({
  tailoringRunId: z.string().uuid(),
  tailoredResume: TailoredResumeSchema,
  matchTailored: MatchScoreSchema,
  gapAnalysis: GapAnalysisSchema,
  consistencyReport: ConsistencyReportSchema.optional(),
  inferenceMode: InferenceModeSchema.optional(),
  inferenceNotice: z.string().optional(),
});

export type TailorResponse = z.infer<typeof TailorResponseSchema>;
