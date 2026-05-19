import { NextResponse } from "next/server";
import {
  extractTextFromDocx,
  extractTextFromPdf,
  normalizeExtractedText,
} from "@/lib/ingest";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Helper to check magic bytes
function verifyMagicBytes(buffer: Buffer, type: "pdf" | "docx"): boolean {
  if (buffer.length < 4) return false;

  // PDF magic bytes: %PDF (25 50 44 46)
  if (type === "pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // DOCX (ZIP format) magic bytes: PK\x03\x04 (50 4b 03 04)
  if (type === "docx") {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded", code: "MISSING_FILE" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size allowed is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          code: "FILE_TOO_LARGE",
        },
        { status: 400 }
      );
    }

    // Validate MIME type
    const mimeType = file.type;
    const isPdfMime = mimeType === "application/pdf";
    const isDocxMime =
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isPdfMime && !isDocxMime) {
      return NextResponse.json(
        {
          error: "Unsupported file type. Please upload a PDF (.pdf) or DOCX (.docx) resume.",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify magic bytes (protect against renamed extensions)
    const fileType = isPdfMime ? "pdf" : "docx";
    if (!verifyMagicBytes(buffer, fileType)) {
      return NextResponse.json(
        {
          error: `The uploaded file is not a valid ${fileType.toUpperCase()} document, even though its extension suggests it is.`,
          code: "MALFORMED_FILE",
        },
        { status: 400 }
      );
    }

    let extractedText = "";

    if (fileType === "pdf") {
      extractedText = await extractTextFromPdf(buffer);
    } else {
      extractedText = await extractTextFromDocx(buffer);
    }

    const normalizedText = normalizeExtractedText(extractedText);

    // Guard against scanned / empty PDF / DOCX
    if (!normalizedText || normalizedText.length < 10) {
      return NextResponse.json(
        {
          error: "Could not extract readable text from the document. Please ensure it has a text layer (is not a scanned image) and is not password-protected.",
          code: "EMPTY_EXTRACTION",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: normalizedText });
  } catch (error) {
    console.error("[ingest.api] Error during file ingestion:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal ingestion failure";

    // Handle mammoth or pdf-parse throw errors
    if (errorMessage.includes("password-protected") || errorMessage.includes("encrypted")) {
      return NextResponse.json(
        {
          error: "Password-protected PDFs are not supported. Please upload an unlocked PDF.",
          code: "ENCRYPTED_FILE",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: `Failed to process document: ${errorMessage}`,
        code: "INGESTION_ERROR",
      },
      { status: 500 }
    );
  }
}
