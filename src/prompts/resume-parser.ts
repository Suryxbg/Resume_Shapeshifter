import { TRUTHFULNESS_SYSTEM } from "./truthfulness";

export function buildResumeParserMessages(resumeText: string) {
  return [
    { role: "system" as const, content: TRUTHFULNESS_SYSTEM },
    {
      role: "user" as const,
      content: `Parse the resume below into structured JSON. Use only information present in the text.

Return JSON matching this shape:
{
  "contact": { "name"?: string, "email"?: string, "phone"?: string, "location"?: string, ... },
  "summary": string,
  "skills": string[],
  "experience": [{ "company": string, "title": string, "startDate": string, "endDate": string, "bullets": string[] }],
  "projects": array of objects,
  "education": array of objects,
  "certifications": array of objects
}

Resume:
---
${resumeText}
---`,
    },
  ];
}
