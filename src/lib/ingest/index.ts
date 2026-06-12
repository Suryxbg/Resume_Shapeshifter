import pdf from "pdf-parse";
import mammoth from "mammoth";

/**
 * Normalizes text extracted from documents:
 * - Converts all carriage returns \r\n and \r to \n
 * - Replaces smart/curly quotes and dashes with straight equivalents
 * - Trims horizontal whitespace on every line
 * - Collapses three or more consecutive newlines to maximum of two (preserving paragraph breaks)
 */
export function normalizeExtractedText(text: string): string {
  if (!text) return "";

  // Normalize smart quotes and other common Unicode characters
  let normalized = text
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201c\u201d]/g, '"') // Smart double quotes
    .replace(/[\u2013\u2014]/g, "-") // En/em dashes
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Split into lines, trim horizontal spaces, and preserve layout
  const lines = normalized.split("\n").map((line) => {
    // Trim horizontal spaces (keep newlines separated)
    return line.replace(/[ \t\r\f\v]+/g, " ").trim();
  });

  // Reconstruct the text
  normalized = lines.join("\n");

  // Collapse 3+ consecutive newlines into 2 consecutive newlines
  normalized = normalized.replace(/\n{3,}/g, "\n\n");

  return normalized.trim();
}

/**
 * Extracts raw text from a PDF buffer.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    if (!data || !data.text) {
      throw new Error("Empty PDF text layer");
    }
    return data.text;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PDF parsing error";
    throw new Error(`PDF extraction failed: ${message}`);
  }
}

/**
 * Extracts raw text from a DOCX buffer using mammoth.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (!result || typeof result.value !== "string") {
      throw new Error("Empty DOCX structure");
    }
    return result.value;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown DOCX parsing error";
    throw new Error(`DOCX extraction failed: ${message}`);
  }
}
