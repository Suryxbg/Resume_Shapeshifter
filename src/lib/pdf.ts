import fs from "fs";
import puppeteer from "puppeteer-core";
import type { TailoringRun } from "@/schemas";

const CHROME_PATH = [
  "C:",
  "Program Files",
  "Google",
  "Chrome",
  "Application",
  "chrome.exe",
].join("\\");
const EDGE_PATH = [
  "C:",
  "Program Files (x86)",
  "Microsoft",
  "Edge",
  "Application",
  "msedge.exe",
].join("\\");
const LINUX_CHROMIUM_PATH = ["/usr", "bin", "chromium-browser"].join("/");
const LINUX_CHROME_PATH = ["/usr", "bin", "google-chrome"].join("/");

/**
 * Resolves the path of an available system browser.
 * Supports Windows, Linux, and custom PUPPETEER_EXECUTABLE_PATH configurations.
 */
export function getSystemBrowserPath(): string | null {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (fs.existsSync(CHROME_PATH)) {
    return CHROME_PATH;
  }
  if (fs.existsSync(EDGE_PATH)) {
    return EDGE_PATH;
  }
  if (fs.existsSync(LINUX_CHROMIUM_PATH)) {
    return LINUX_CHROMIUM_PATH;
  }
  if (fs.existsSync(LINUX_CHROME_PATH)) {
    return LINUX_CHROME_PATH;
  }
  return null;
}

/**
 * Generates a valid PDF structure programmatically as a fallback.
 * Uses standard PDF 1.4 elements and handles precise byte calculations.
 */
export function generateValidMockPdf(title: string, lines: string[]): Buffer {
  const sanitize = (str: string) => {
    return str
      .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/[\u2013\u2014]/g, "-") // En/em dashes
      .replace(/[\\()]/g, "\\$&"); // Escape PDF special chars
  };

  const header = "%PDF-1.4\n";

  // Object 1: Catalog
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";

  // Object 2: Pages
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";

  // Object 5: Font definition
  const obj5 =
    "5 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>\nendobj\n";

  // Let's build the content stream (Object 4)
  let streamContent = "BT\n/F1 10 Tf\n14 TL\n50 780 Td\n";

  // Add title
  streamContent += `/F1 14 Tf\n(${sanitize(title)}) Tj T*\n14 TL\n/F1 10 Tf\n\n`;
  streamContent += `(Mock PDF Generated Successfully - Serverless Fallback Mode) Tj T*\n`;
  streamContent += `(Note: High-fidelity formatting was converted to standard clean text.) Tj T*\nT*\n`;

  for (const line of lines) {
    if (line.trim() === "") {
      streamContent += "T*\n";
    } else {
      // Simple text wrapping (limit to approx 80 chars per line)
      const words = line.split(" ");
      let currentLine = "";
      for (const word of words) {
        if ((currentLine + " " + word).length > 80) {
          streamContent += `(${sanitize(currentLine.trim())}) Tj T*\n`;
          currentLine = word;
        } else {
          currentLine += (currentLine ? " " : "") + word;
        }
      }
      if (currentLine) {
        streamContent += `(${sanitize(currentLine.trim())}) Tj T*\n`;
      }
    }
  }
  streamContent += "ET\n";

  const streamLen = Buffer.from(streamContent, "utf-8").length;
  const obj4 = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}endstream\nendobj\n`;

  // Object 3: Page (references Pages, Contents, Font)
  const obj3 =
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 5 0 R /MediaBox [0 0 595.275 841.889] /Contents 4 0 R >>\nendobj\n";

  // Calculate precise offsets for xref (precise byte offsets in UTF-8)
  const offset1 = Buffer.from(header, "utf-8").length;
  const offset2 = offset1 + Buffer.from(obj1, "utf-8").length;
  const offset3 = offset2 + Buffer.from(obj2, "utf-8").length;
  const offset4 = offset3 + Buffer.from(obj3, "utf-8").length;
  const offset5 = offset4 + Buffer.from(obj4, "utf-8").length;
  const startXref = offset5 + Buffer.from(obj5, "utf-8").length;

  const pad10 = (num: number) => {
    return num.toString().padStart(10, "0");
  };

  const xref =
    "xref\n" +
    "0 6\n" +
    "0000000000 65535 f \n" +
    `${pad10(offset1)} 00000 n \n` +
    `${pad10(offset2)} 00000 n \n` +
    `${pad10(offset3)} 00000 n \n` +
    `${pad10(offset4)} 00000 n \n` +
    `${pad10(offset5)} 00000 n \n`;

  const trailer =
    `trailer\n<< /Size 6 /Root 1 0 R >>\n` +
    `startxref\n${startXref}\n` +
    `%%EOF\n`;

  const pdfContent = header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer;
  return Buffer.from(pdfContent, "utf-8");
}

/**
 * Builds structured plain text representation of the tailored resume for fallback.
 */
export function buildTailoredResumeFallbackLines(run: TailoringRun): string[] {
  const resume = run.resumeProfile;
  const tailor = run.tailoredResume;
  if (!resume || !tailor) return [];

  const lines: string[] = [];

  // Header contact
  const contactKeys = Object.keys(resume.contact || {});
  const contactLine = contactKeys
    .map((key) => `${key}: ${resume.contact[key]}`)
    .join("  |  ");

  lines.push(contactLine);
  lines.push("");

  // Summary
  lines.push("SUMMARY");
  lines.push(
    "--------------------------------------------------------------------------------"
  );
  lines.push(tailor.tailoredSummary);
  lines.push("");

  // Skills
  lines.push("CORE COMPETENCIES");
  lines.push(
    "--------------------------------------------------------------------------------"
  );
  lines.push(tailor.tailoredSkills.join("  •  "));
  lines.push("");

  // Experience
  lines.push("PROFESSIONAL EXPERIENCE");
  lines.push(
    "--------------------------------------------------------------------------------"
  );
  for (const job of tailor.tailoredExperience) {
    lines.push(`${job.title} - ${job.company}`);
    for (const b of job.bullets) {
      lines.push(`  • ${b.tailored}`);
    }
    lines.push("");
  }

  return lines;
}

/**
 * Builds structured plain text representation of the comparison report for fallback.
 */
export function buildComparisonFallbackLines(run: TailoringRun): string[] {
  const resume = run.resumeProfile;
  const jd = run.jobDescriptionProfile;
  const origMatch = run.matchOriginal;
  const tailMatch = run.matchTailored;
  const tailor = run.tailoredResume;
  const gaps = run.gapAnalysis;

  if (!resume || !jd || !origMatch || !tailor) return [];

  const lines: string[] = [];

  lines.push(
    `Target Job: ${jd.jobTitle} ${jd.company ? `at ${jd.company}` : ""}`
  );
  lines.push("");
  lines.push(`Original Match Score: ${origMatch.overallScore}%`);
  lines.push(`Original Match Explanation: ${origMatch.explanation}`);
  lines.push("");
  lines.push(`Tailored Match Score: ${tailMatch?.overallScore ?? "N/A"}%`);
  lines.push(`Tailored Match Explanation: ${tailMatch?.explanation ?? ""}`);
  lines.push("");

  lines.push("BULLET IMPROVEMENTS (ORIGINAL -> TAILORED)");
  lines.push(
    "--------------------------------------------------------------------------------"
  );
  for (const job of tailor.tailoredExperience) {
    lines.push(`[${job.company}] ${job.title}`);
    for (const b of job.bullets) {
      lines.push(`  - Original: ${b.original}`);
      lines.push(`  + Tailored: ${b.tailored}`);
      lines.push(`    Reason: ${b.changeReason}`);
      lines.push("");
    }
  }

  if (gaps?.gaps && gaps.gaps.length > 0) {
    lines.push("GAPS & RISK AUDIT");
    lines.push(
      "--------------------------------------------------------------------------------"
    );
    for (const g of gaps.gaps) {
      lines.push(`  • ${g.name} (${g.importance.toUpperCase()} Importance)`);
      lines.push(`    Evidence: ${g.jdEvidence}`);
      lines.push(`    Action: ${g.suggestedAction}`);
      lines.push("");
    }
  }

  return lines;
}

/**
 * Generates a PDF buffer from an HTML template string using local puppeteer-core.
 * In environments where no local browser is found (e.g., CI/CD), falls back
 * gracefully to returning a mock PDF buffer to ensure stability.
 */
export async function generatePdf(
  htmlContent: string,
  kind?: "tailored" | "comparison",
  run?: TailoringRun
): Promise<Buffer> {
  const browserPath = getSystemBrowserPath();

  if (
    !browserPath ||
    process.env.NODE_ENV === "test" ||
    process.env.PDF_FORCE_MOCK === "true"
  ) {
    console.warn(
      "[pdf-generator] No local system browser found or in test mode. Returning dynamic valid PDF buffer."
    );

    if (run && kind === "tailored") {
      const title = `${run.resumeProfile?.contact?.Name || run.resumeProfile?.contact?.name || "Candidate"} - Tailored Resume`;
      const lines = buildTailoredResumeFallbackLines(run);
      return generateValidMockPdf(title, lines);
    } else if (run && kind === "comparison") {
      const title = `Tailoring Comparison Report - ${run.jobDescriptionProfile?.jobTitle || ""}`;
      const lines = buildComparisonFallbackLines(run);
      return generateValidMockPdf(title, lines);
    }

    // Default generic valid mock PDF for tests or missing run parameter
    return generateValidMockPdf("Mock PDF Generated Successfully", [
      "This is a fallback PDF file generated because a headless browser",
      "was not detected in this environment (e.g. serverless functions).",
      "To enable high-fidelity PDF rendering, please run this application",
      "in an environment that supports Chrome/Edge, or configure your Docker",
      "container to run standard Chromium.",
    ]);
  }

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    // Wait for the HTML content to load fully
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
    const pdfArray = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "15mm",
        right: "15mm",
      },
    });
    return Buffer.from(pdfArray);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PDF engine failure";
    throw new Error(`PDF generation engine failed: ${message}`);
  } finally {
    await browser.close();
  }
}

/**
 * Builds an ATS-friendly, clean tailored resume in HTML format.
 */
export function buildTailoredResumeHtml(run: TailoringRun): string {
  const resume = run.resumeProfile;
  const tailor = run.tailoredResume;

  if (!resume || !tailor) {
    throw new Error(
      "Missing required resume or tailoring profiles to render PDF."
    );
  }

  // Header contact fields
  const contactKeys = Object.keys(resume.contact || {});
  const contactLine = contactKeys
    .map((key) => `${key}: ${resume.contact[key]}`)
    .join("  |  ");

  // Experience entry date lookup helper
  const findOriginalDates = (company: string, title: string) => {
    const matched =
      resume.experience?.find(
        (exp) =>
          (exp.company.toLowerCase().includes(company.toLowerCase()) ||
            company.toLowerCase().includes(exp.company.toLowerCase())) &&
          (exp.title.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(exp.title.toLowerCase()))
      ) ||
      resume.experience?.find(
        (exp) =>
          exp.company.toLowerCase().includes(company.toLowerCase()) ||
          company.toLowerCase().includes(exp.company.toLowerCase())
      );
    return matched
      ? { start: matched.startDate, end: matched.endDate }
      : { start: "", end: "" };
  };

  // Build Experience list HTML
  const experienceHtml = tailor.tailoredExperience
    .map((job) => {
      const dates = findOriginalDates(job.company, job.title);
      const datesString = dates.start ? `${dates.start} - ${dates.end}` : "";

      const bulletsHtml = job.bullets
        .map(
          (b) =>
            `<li style="margin-bottom: 6px; line-height: 1.4;">${b.tailored}</li>`
        )
        .join("");

      return `
        <div style="margin-bottom: 18px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
            <tr>
              <td style="font-weight: bold; font-size: 14px; color: #1f2937;">${job.title}</td>
              <td style="text-align: right; font-size: 13px; color: #6b7280; font-style: italic;">${datesString}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; font-style: italic; color: #4b5563;">${job.company}</td>
              <td></td>
            </tr>
          </table>
          <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #374151;">
            ${bulletsHtml}
          </ul>
        </div>
      `;
    })
    .join("");

  // Section helper for simple lists
  const renderSimpleSection = (
    title: string,
    items: Record<string, unknown>[]
  ) => {
    if (!items || items.length === 0) return "";

    const itemsHtml = items
      .map((item) => {
        const keys = Object.keys(item);
        const name = keys[0] ? String(item[keys[0]] || "") : "";
        const details = keys
          .slice(1)
          .map((k) => `${k}: ${String(item[k] || "")}`)
          .join(", ");
        return `<li style="margin-bottom: 4px; line-height: 1.4;"><strong>${name}</strong>${details ? ` - ${details}` : ""}</li>`;
      })
      .join("");

    return `
      <div style="margin-top: 20px;">
        <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; color: #1f2937; margin-bottom: 8px; letter-spacing: 0.05em;">${title}</h2>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #374151;">
          ${itemsHtml}
        </ul>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tailored Resume</title>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          margin: 0;
          padding: 0;
          color: #111827;
          background-color: #ffffff;
        }
      </style>
    </head>
    <body>
      <div style="width: 100%; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="font-size: 26px; font-weight: normal; margin: 0 0 6px 0; color: #111827;">
            ${resume.contact?.Name || resume.contact?.name || "Candidate Resume"}
          </h1>
          <div style="font-size: 11px; color: #4b5563; font-family: sans-serif;">
            ${contactLine}
          </div>
        </div>

        <!-- Summary -->
        <div style="margin-top: 15px;">
          <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; color: #1f2937; margin-bottom: 8px; letter-spacing: 0.05em;">Summary</h2>
          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #374151; text-align: justify;">
            ${tailor.tailoredSummary}
          </p>
        </div>

        <!-- Skills -->
        <div style="margin-top: 20px;">
          <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; color: #1f2937; margin-bottom: 8px; letter-spacing: 0.05em;">Core Competencies</h2>
          <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #374151;">
            <strong>Skills:</strong> ${tailor.tailoredSkills.join("  •  ")}
          </p>
        </div>

        <!-- Experience -->
        <div style="margin-top: 20px;">
          <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; color: #1f2937; margin-bottom: 8px; letter-spacing: 0.05em;">Professional Experience</h2>
          ${experienceHtml}
        </div>

        <!-- Additional Sections -->
        ${renderSimpleSection("Education", resume.education)}
        ${renderSimpleSection("Projects", resume.projects)}
        ${renderSimpleSection("Certifications", resume.certifications)}

      </div>
    </body>
    </html>
  `;
}

/**
 * Builds a gorgeous side-by-side Tailoring Comparison report in HTML format.
 */
export function buildComparisonHtml(run: TailoringRun): string {
  const resume = run.resumeProfile;
  const jd = run.jobDescriptionProfile;
  const origMatch = run.matchOriginal;
  const tailMatch = run.matchTailored;
  const tailor = run.tailoredResume;
  const gaps = run.gapAnalysis;

  if (!resume || !jd || !origMatch || !tailor) {
    throw new Error(
      "Missing required tailoring profiles to build comparison PDF."
    );
  }

  // Render original vs tailored score card HTML
  const tailScore = tailMatch?.overallScore ?? "N/A";
  const tailScoreExplanation =
    tailMatch?.explanation ??
    "Tailored score metrics generated asynchronously.";

  // Build Gap Analysis rows
  const gapsHtml = (gaps?.gaps || [])
    .map((g) => {
      const importanceBadge =
        g.importance === "high"
          ? `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; font-size: 9px; border-radius: 4px; font-weight: bold; font-family: sans-serif;">High Priority</span>`
          : g.importance === "medium"
            ? `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; font-size: 9px; border-radius: 4px; font-weight: bold; font-family: sans-serif;">Medium</span>`
            : `<span style="background-color: #f0fdf4; color: #166534; padding: 2px 6px; font-size: 9px; border-radius: 4px; font-weight: bold; font-family: sans-serif;">Low</span>`;

      const safeBadge = g.canSafelyAdd
        ? `<span style="background-color: #ecfdf5; color: #065f46; padding: 2px 6px; font-size: 9px; border-radius: 4px; font-weight: bold; font-family: sans-serif; margin-left: 4px;">Safely Addable</span>`
        : "";

      return `
        <div style="padding: 10px; border-bottom: 1px solid #f3f4f6; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 12px; color: #1f2937;">${g.name}</strong>
            <div>
              ${importanceBadge}
              ${safeBadge}
            </div>
          </div>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #4b5563; line-height: 1.4;"><strong>Evidence:</strong> ${g.jdEvidence}</p>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #4b5563; line-height: 1.4;"><strong>Suggested Action:</strong> ${g.suggestedAction}</p>
        </div>
      `;
    })
    .join("");

  // Build visual bullet diff items
  const bulletsDiffHtml = tailor.tailoredExperience
    .map((job) => {
      const jobBulletsHtml = job.bullets
        .map((bullet) => {
          const confidenceColor =
            bullet.confidence === "high"
              ? "#10b981"
              : bullet.confidence === "medium"
                ? "#f59e0b"
                : "#ef4444";

          const riskAlert = bullet.riskFlag
            ? `<div style="margin-top: 6px; background-color: #fef2f2; border-left: 3px solid #ef4444; padding: 6px; border-radius: 4px; font-size: 10px; color: #991b1b;"><strong>Tailoring Risk Warning:</strong> ${bullet.riskFlag}</div>`
            : "";

          return `
            <div style="margin-bottom: 16px; background-color: #fafafa; border: 1px solid #f3f4f6; border-radius: 8px; overflow: hidden; font-size: 11px;">
              <!-- Comparison Container -->
              <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                <tr>
                  <!-- Left: Original Bullet -->
                  <td style="width: 50%; padding: 12px; vertical-align: top; border-right: 1px solid #e5e7eb; background-color: #fef2f2;">
                    <div style="color: #991b1b; font-weight: bold; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; margin-bottom: 6px; font-family: sans-serif;">Original Bullet</div>
                    <div style="color: #4b5563; line-height: 1.4;">${bullet.original}</div>
                  </td>
                  <!-- Right: Tailored Bullet -->
                  <td style="width: 50%; padding: 12px; vertical-align: top; background-color: #ecfdf5;">
                    <div style="color: #065f46; font-weight: bold; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; margin-bottom: 6px; font-family: sans-serif;">Tailored Bullet</div>
                    <div style="color: #1f2937; line-height: 1.4; font-weight: 500;">${bullet.tailored}</div>
                  </td>
                </tr>
              </table>
              
              <!-- Bullet Metadata -->
              <div style="padding: 10px; border-top: 1px solid #e5e7eb; background-color: #ffffff; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 10px; color: #4b5563; margin-bottom: 6px;">
                  <span><strong>Reason:</strong> ${bullet.changeReason}</span>
                  <span>|</span>
                  <span><strong>Keywords Addressed:</strong> ${bullet.keywordsAddressed.length > 0 ? bullet.keywordsAddressed.map((k) => `<code>${k}</code>`).join(", ") : "None"}</span>
                  <span>|</span>
                  <span><strong>Confidence:</strong> <span style="color: ${confidenceColor}; font-weight: bold;">${bullet.confidence.toUpperCase()}</span></span>
                </div>
                ${riskAlert}
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 13px; font-weight: bold; color: #374151; margin: 0 0 10px 0; border-left: 3px solid #1f2937; padding-left: 8px;">
            ${job.title} <span style="font-weight: normal; color: #6b7280; font-style: italic;">at ${job.company}</span>
          </h3>
          ${jobBulletsHtml}
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Comparison Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1f2937;
          background-color: #ffffff;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
        code {
          background-color: #f3f4f6;
          padding: 1px 4px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 9px;
        }
      </style>
    </head>
    <body>
      <div style="width: 100%; max-width: 900px; margin: 0 auto; box-sizing: border-box;">
        
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px;">
          <tr>
            <td>
              <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 4px 0; letter-spacing: -0.02em;">Resume Tailoring Comparison & Insights</h1>
              <p style="font-size: 12px; color: #4b5563; margin: 0;">
                Target Job: <strong>${jd.jobTitle}</strong> ${jd.company ? `at <strong>${jd.company}</strong>` : ""}
              </p>
            </td>
            <td style="text-align: right; vertical-align: bottom;">
              <span style="font-size: 11px; color: #9ca3af; font-family: monospace;">Date: ${new Date().toLocaleDateString()}</span>
            </td>
          </tr>
        </table>

        <!-- Scores Block -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tr>
            <!-- Original Score -->
            <td style="width: 48%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; vertical-align: top; background-color: #fafafa;">
              <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 6px;">Original Match</div>
              <div style="font-size: 32px; font-weight: 800; color: #ef4444; margin-bottom: 8px;">${origMatch.overallScore}%</div>
              <p style="margin: 0; font-size: 11px; color: #4b5563; line-height: 1.4; text-align: left;">${origMatch.explanation}</p>
            </td>
            
            <td style="width: 4%;"></td>
            
            <!-- Tailored Score -->
            <td style="width: 48%; border: 1px solid #10b981; border-radius: 8px; padding: 15px; text-align: center; vertical-align: top; background-color: #f0fdf4;">
              <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #047857; margin-bottom: 6px;">Tailored Match</div>
              <div style="font-size: 32px; font-weight: 800; color: #10b981; margin-bottom: 8px;">${tailScore}%</div>
              <p style="margin: 0; font-size: 11px; color: #047857; line-height: 1.4; text-align: left;">${tailScoreExplanation}</p>
            </td>
          </tr>
        </table>

        <!-- JD Summary -->
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 25px; font-size: 11px; color: #4b5563;">
          <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0; color: #374151;">Target Job Requirements Summary</h2>
          <div style="margin-bottom: 6px;"><strong>Seniority Level:</strong> ${jd.seniorityLevel}</div>
          <div style="margin-bottom: 6px;"><strong>Top Required Skills:</strong> ${jd.requiredSkills.join(", ")}</div>
          <div><strong>Core Responsibilities:</strong> ${jd.responsibilities.slice(0, 3).join(" · ")}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <!-- Left: Bullets comparison -->
            <td style="width: 65%; padding-right: 20px; vertical-align: top;">
              <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; color: #111827; margin: 0 0 15px 0;">Bullet Improvements</h2>
              ${bulletsDiffHtml}
            </td>
            
            <!-- Right: Gaps Resolved -->
            <td style="width: 35%; vertical-align: top; border-left: 1px solid #e5e7eb; padding-left: 20px;">
              <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; color: #111827; margin: 0 0 15px 0;">Gaps & Risk Audit</h2>
              <div style="background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px;">
                ${gapsHtml}
              </div>
            </td>
          </tr>
        </table>

        <!-- Disclaimer -->
        <div style="border-top: 1px solid #e5e7eb; margin-top: 35px; padding-top: 15px; text-align: center;">
          <p style="font-size: 10px; color: #9ca3af; line-height: 1.4; margin: 0;">
            Disclaimer: This tailored resume and comparison report were automatically generated using advanced AI heuristics. The user remains solely responsible for validating all claims, credentials, and experience before applying to jobs.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}
