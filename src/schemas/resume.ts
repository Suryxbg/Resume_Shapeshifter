import { z } from "zod";

/** Free-form contact fields (MVP). */
export const ContactSchema = z.record(z.string(), z.string());

export const ExperienceEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  bullets: z.array(z.string()),
});

/** Loose records for sections that vary widely across resumes. */
export const LooseSectionItemSchema = z.record(z.string(), z.unknown());

export const ResumeProfileSchema = z.object({
  contact: ContactSchema.default({}),
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  experience: z.array(ExperienceEntrySchema).default([]),
  projects: z.array(LooseSectionItemSchema).default([]),
  education: z.array(LooseSectionItemSchema).default([]),
  certifications: z.array(LooseSectionItemSchema).default([]),
});

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
