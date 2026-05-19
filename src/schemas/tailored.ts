import { z } from "zod";

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

export const TailoredBulletSchema = z.object({
  original: z.string(),
  tailored: z.string(),
  changeReason: z.string(),
  keywordsAddressed: z.array(z.string()).default([]),
  confidence: ConfidenceSchema,
  riskFlag: z.string().optional(),
});

export const TailoredExperienceEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  bullets: z.array(TailoredBulletSchema),
});

export const TailoredResumeSchema = z.object({
  tailoredSummary: z.string(),
  tailoredSkills: z.array(z.string()).default([]),
  tailoredExperience: z.array(TailoredExperienceEntrySchema).default([]),
});

export type TailoredResume = z.infer<typeof TailoredResumeSchema>;
export type TailoredBullet = z.infer<typeof TailoredBulletSchema>;
