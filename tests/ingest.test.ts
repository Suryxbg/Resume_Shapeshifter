import { describe, expect, it, vi } from "vitest";
import {
  normalizeExtractedText,
  extractTextFromPdf,
  extractTextFromDocx,
} from "@/lib/ingest";

// Mock pdf-parse
vi.mock("pdf-parse", () => {
  return {
    default: vi.fn().mockImplementation(async (buffer: Buffer) => {
      if (buffer.toString() === "CORRUPT") {
        throw new Error("Invalid PDF header");
      }
      return { text: "Extracted PDF content successfully." };
    }),
  };
});

// Mock mammoth
vi.mock("mammoth", () => {
  return {
    default: {
      extractRawText: vi.fn().mockImplementation(async ({ buffer }) => {
        if (buffer.toString() === "CORRUPT") {
          throw new Error("Invalid DOCX zip archive");
        }
        return { value: "Extracted DOCX content successfully." };
      }),
    },
  };
});

describe("Document Ingestion Pipeline", () => {
  describe("normalizeExtractedText", () => {
    it("converts smart single and double quotes to straight ones", () => {
      const input = "This is \u201csmart double\u201d and \u2018smart single\u2019 quotes.";
      expect(normalizeExtractedText(input)).toBe(
        `This is "smart double" and 'smart single' quotes.`
      );
    });

    it("converts en-dashes and em-dashes to standard hyphen", () => {
      const input = "2020\u20132023 \u2014 Senior Engineer";
      expect(normalizeExtractedText(input)).toBe("2020-2023 - Senior Engineer");
    });

    it("normalizes carriage returns and multiple spacing", () => {
      const input = "Line 1\r\nLine 2\rLine 3\n  Double   Spacing  Here  ";
      expect(normalizeExtractedText(input)).toBe(
        "Line 1\nLine 2\nLine 3\nDouble Spacing Here"
      );
    });

    it("collapses three or more newlines to maximum of two", () => {
      const input = "Paragraph 1\n\n\n\nParagraph 2\n\n\nParagraph 3";
      expect(normalizeExtractedText(input)).toBe(
        "Paragraph 1\n\nParagraph 2\n\nParagraph 3"
      );
    });

    it("handles empty or null string gracefully", () => {
      expect(normalizeExtractedText("")).toBe("");
    });
  });

  describe("extractTextFromPdf", () => {
    it("successfully extracts text from a valid buffer mock", async () => {
      const buffer = Buffer.from("PDF_FILE_HEADER");
      const text = await extractTextFromPdf(buffer);
      expect(text).toBe("Extracted PDF content successfully.");
    });

    it("throws a clear error on failure", async () => {
      const buffer = Buffer.from("CORRUPT");
      await expect(extractTextFromPdf(buffer)).rejects.toThrow(
        "PDF extraction failed: Invalid PDF header"
      );
    });
  });

  describe("extractTextFromDocx", () => {
    it("successfully extracts text from a valid docx buffer mock", async () => {
      const buffer = Buffer.from("DOCX_FILE_HEADER");
      const text = await extractTextFromDocx(buffer);
      expect(text).toBe("Extracted DOCX content successfully.");
    });

    it("throws a clear error on failure", async () => {
      const buffer = Buffer.from("CORRUPT");
      await expect(extractTextFromDocx(buffer)).rejects.toThrow(
        "DOCX extraction failed: Invalid DOCX zip archive"
      );
    });
  });
});
