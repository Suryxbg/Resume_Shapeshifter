import { z } from "zod";

export const JobDescriptionProfileSchema = z.object({
  jobTitle: z.string(),
  company: z.string(),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  qualifications: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  seniorityLevel: z.string(),
  domainSignals: z.array(z.string()).default([]),
});

export type JobDescriptionProfile = z.infer<typeof JobDescriptionProfileSchema>;
