import type { TailoredResume } from "@/schemas";

/** Assemble a plain-text representation of the tailored resume for storage. */
export function assembleGeneratedResumeText(tailored: TailoredResume): string {
  const sections: string[] = [];

  if (tailored.tailoredSummary) {
    sections.push("SUMMARY", tailored.tailoredSummary, "");
  }

  if (tailored.tailoredSkills.length > 0) {
    sections.push("SKILLS", tailored.tailoredSkills.join(" · "), "");
  }

  for (const exp of tailored.tailoredExperience) {
    sections.push(`${exp.title} — ${exp.company}`);
    for (const bullet of exp.bullets) {
      sections.push(`• ${bullet.tailored}`);
    }
    sections.push("");
  }

  return sections.join("\n").trim();
}
