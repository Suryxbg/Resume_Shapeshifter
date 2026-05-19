/** Rough guard against oversized pastes before sending to Groq (edge-case.md Phase 2). */
const MAX_INPUT_CHARS = 48_000;

export function capInputText(text: string, label: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return `${text.slice(0, MAX_INPUT_CHARS)}\n\n[${label} truncated for model context]`;
}
