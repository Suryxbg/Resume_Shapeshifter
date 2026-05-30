import type { ResumeProfile } from "@/schemas";
import type { TailoredResume } from "@/schemas";

/**
 * Merged view for scoring the tailored resume (architecture.md §4.8).
 * Original contact, education, certifications, and job structure are source of truth;
 * summary, skills order, and experience bullets come from tailoring output where present.
 */
export type AssembledResumeForScoring = ResumeProfile;

export function assembleResumeForScoring(
  original: ResumeProfile,
  tailored: TailoredResume
): AssembledResumeForScoring {
  const experience = original.experience.map((exp, idx) => {
    const tExp = tailored.tailoredExperience[idx];
    if (!tExp) return { ...exp };
    return {
      ...exp,
      company: exp.company || tExp.company,
      title: exp.title || tExp.title,
      bullets: tExp.bullets.map((b) => b.tailored),
    };
  });

  return {
    contact: original.contact,
    summary: tailored.tailoredSummary || original.summary,
    skills:
      tailored.tailoredSkills.length > 0
        ? tailored.tailoredSkills
        : original.skills,
    experience,
    projects: original.projects,
    education: original.education,
    certifications: original.certifications,
  };
}
