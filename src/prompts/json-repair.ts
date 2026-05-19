export function buildJsonRepairMessages(invalidOutput: string, schemaHint: string) {
  return [
    {
      role: "system" as const,
      content:
        "You fix invalid JSON. Output only a single valid JSON object matching the requested schema. No markdown.",
    },
    {
      role: "user" as const,
      content: `The previous output failed validation. Fix it.

Schema / shape:
${schemaHint}

Invalid output:
---
${invalidOutput.slice(0, 12000)}
---`,
    },
  ];
}
