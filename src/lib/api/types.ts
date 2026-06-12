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
  /** Fallback payload for serverless environments where in-memory run store is empty. */
  fallback: z
    .object({
      resumeText: z.string().min(1),
      jdText: z.string().min(1),
      resumeProfile: ResumeProfileSchema,
      jobDescriptionProfile: JobDescriptionProfileSchema,
      matchOriginal: MatchScoreSchema,
      gapAnalysis: GapAnalysisSchema,
    })
    .optional(),
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

export const SaveResumeRequestSchema = z.object({
  tailoringRunId: z.string().uuid(),
  resumeText: z.string().min(1),
  jdText: z.string().min(1),
  analyze: AnalyzeResponseSchema,
  tailor: TailorResponseSchema,
});

export type SaveResumeRequest = z.infer<typeof SaveResumeRequestSchema>;

export const ResumeHistoryItemSchema = z.object({
  id: z.string().uuid(),
  jobTitle: z.string(),
  companyName: z.string().nullable(),
  atsScore: z.number().nullable(),
  tailoringRunId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ResumeHistoryItem = z.infer<typeof ResumeHistoryItemSchema>;

export const ResumeHistoryDetailSchema = ResumeHistoryItemSchema.extend({
  originalResumeText: z.string(),
  jobDescriptionText: z.string(),
  generatedResumeText: z.string(),
  runData: z
    .object({
      resumeText: z.string(),
      jdText: z.string(),
      analyze: AnalyzeResponseSchema,
      tailor: TailorResponseSchema,
    })
    .nullable(),
});

export type ResumeHistoryDetail = z.infer<typeof ResumeHistoryDetailSchema>;
