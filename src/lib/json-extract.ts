/**
 * Extract JSON from model text (fences, leading prose, trailing commentary).
 */
export function extractJsonObject(text: string): string {
  let s = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```\s*$/i.exec(s);
  if (fence) {
    s = fence[1].trim();
  } else {
    const inline = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
    if (inline) s = inline[1].trim();
  }

  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
  return s.slice(start, end + 1);
}

export function parseJsonObject(text: string): unknown {
  return JSON.parse(extractJsonObject(text)) as unknown;
}
