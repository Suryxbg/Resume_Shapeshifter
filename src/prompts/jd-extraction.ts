import { TRUTHFULNESS_SYSTEM } from "./truthfulness";

export function buildJdExtractionMessages(jdText: string) {
  return [
    { role: "system" as const, content: TRUTHFULNESS_SYSTEM },
    {
      role: "user" as const,
      content: `Extract structured job description data from the text below.

Return JSON matching this shape (all string fields may be empty if unknown):
{
  "jobTitle": string,
  "company": string,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "responsibilities": string[],
  "qualifications": string[],
  "tools": string[],
  "keywords": string[],
  "seniorityLevel": string,
  "domainSignals": string[]
}

Job description:
---
${jdText}
---`,
    },
  ];
}
