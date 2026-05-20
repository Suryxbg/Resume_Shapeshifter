const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function getSystemBrowserPath() {
  if (fs.existsSync(CHROME_PATH)) return CHROME_PATH;
  if (fs.existsSync(EDGE_PATH)) return EDGE_PATH;
  return null;
}

// Premium markdown-to-HTML parser designed for the report structure
function markdownToHtml(md) {
  let html = md;

  // Preserve code blocks before escaping HTML
  const codeBlocks = [];
  html = html.replace(/```(mermaid|text|json|typescript)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ id, lang, code });
    return id;
  });

  // Escape HTML entities to prevent rendering issues
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Restore links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Headers
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");

  // Horizontal Rules
  html = html.replace(/^---$/gm, "<hr />");

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Inline Code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Handle list items
  html = html.replace(/^\s*-\s+(.*)$/gm, "<li>$1</li>");
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, "<li>$1</li>");

  // Group list items into <ul> blocks
  const lines = html.split("\n");
  let inList = false;
  let newLines = [];

  for (let line of lines) {
    const isLi = line.trim().startsWith("<li>");
    if (isLi) {
      if (!inList) {
        inList = true;
        newLines.push("<ul>");
      }
      newLines.push(line);
    } else {
      if (inList) {
        inList = false;
        newLines.push("</ul>");
      }
      const trimmed = line.trim();
      if (trimmed && 
          !trimmed.startsWith("<h") && 
          !trimmed.startsWith("<hr") && 
          !trimmed.startsWith("<ul") && 
          !trimmed.startsWith("</ul") && 
          !trimmed.startsWith("__CODE_BLOCK_")) {
        newLines.push(`<p>${line}</p>`);
      } else {
        newLines.push(line);
      }
    }
  }
  if (inList) {
    newLines.push("</ul>");
  }

  html = newLines.join("\n");

  // Restore and style code blocks
  for (const block of codeBlocks) {
    if (block.lang === "mermaid") {
      // Return a highly styled, print-friendly comparative layout
      const pipelineLayout = `
<div class="pipeline-comparison">
  <div class="pipeline-column old-pipeline">
    <div class="pipeline-header">Old Workflow (7 LLM Calls)</div>
    <div class="pipeline-step">1. Ingest (Resume & JD Text)</div>
    <div class="pipeline-arrow">↓</div>
    <div class="pipeline-step alert">2. Resume Parser (LLM)</div>
    <div class="pipeline-arrow">↓</div>
    <div class="pipeline-step alert">3. JD Extractor (LLM)</div>
    <div class="pipeline-arrow">↓</div>
    <div class="pipeline-step alert">4. Original Match Score (LLM)</div>
    <div class="pipeline-arrow">↓</div>
    <div class="pipeline-step alert">5. Original Gap Analysis (LLM)</div>
    <div class="pipeline-arrow">↓</div>
    <div class="pipeline-step alert">6. Bullet Rewriter (LLM)</div>
    <div class="pipeline-arrow">↓</div>
    <div class="pipeline-step alert">7. Tailored Match Score (LLM)</div>
    <div class="pipeline-arrow">↓</div>
    <div class="pipeline-step alert">8. Tailored Gap Analysis (LLM)</div>
  </div>
  
  <div class="pipeline-column new-pipeline">
    <div class="pipeline-header">New Workflow (2 LLM Calls)</div>
    <div class="pipeline-step">1. Ingest (Resume & JD Text)</div>
    <div class="pipeline-arrow">↓</div>
    <div class="pipeline-step success">2. Combined Analyze (LLM)</div>
    <div class="pipeline-details">Parses Resume, Extracts JD, Scores Match, Analyses Gaps in ONE call</div>
    <div class="pipeline-arrow" style="margin: 30px 0 6px 0;">↓</div>
    <div class="pipeline-step success" style="margin-top: 10px;">3. Combined Tailor (LLM)</div>
    <div class="pipeline-details">Rewrites bullets, Scores tailored match, updates gaps in ONE call</div>
  </div>
</div>
      `;
      html = html.replace(block.id, pipelineLayout);
    } else {
      html = html.replace(block.id, `<pre><code>${block.code}</code></pre>`);
    }
  }

  return html;
}

async function run() {
  const mdPath = "C:\\Users\\bgsur\\.gemini\\antigravity\\brain\\cd1ab87a-7aa4-4da4-9e5e-534e78246205\\analysis_and_optimization_report.md";
  const pdfDestPath = "C:\\Users\\bgsur\\.gemini\\antigravity\\brain\\cd1ab87a-7aa4-4da4-9e5e-534e78246205\\analysis_and_optimization_report.pdf";
  const pdfLocalPath = path.resolve(__dirname, "../analysis_and_optimization_report.pdf");
  const tempHtmlPath = path.resolve(__dirname, "../temp_report.html");

  console.log("Reading markdown report...");
  if (!fs.existsSync(mdPath)) {
    console.error(`Error: Report markdown file not found at ${mdPath}`);
    process.exit(1);
  }
  const mdContent = fs.readFileSync(mdPath, "utf-8");

  console.log("Converting markdown to beautiful HTML...");
  const bodyHtml = markdownToHtml(mdContent);

  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Token Optimization & Key Update Walkthrough</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #334155;
      background-color: #ffffff;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 16px;
      margin-top: 0;
      margin-bottom: 24px;
      letter-spacing: -0.025em;
    }
    h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 32px;
      margin-bottom: 16px;
      letter-spacing: -0.020em;
      border-left: 4px solid #0f172a;
      padding-left: 12px;
    }
    h3 {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    p {
      font-size: 13.5px;
      color: #475569;
      margin-bottom: 16px;
    }
    hr {
      border: 0;
      border-top: 1px solid #f1f5f9;
      margin: 32px 0;
    }
    a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    ul {
      padding-left: 20px;
      margin-bottom: 20px;
    }
    li {
      font-size: 13.5px;
      color: #475569;
      margin-bottom: 8px;
    }
    pre {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      margin: 20px 0;
    }
    code {
      font-family: 'Fira Code', 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #0f172a;
    }
    p code, li code {
      background-color: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 11.5px;
    }
    .pipeline-comparison {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin: 30px 0;
    }
    .pipeline-column {
      flex: 1;
      border-radius: 8px;
      padding: 20px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .old-pipeline {
      border-top: 4px solid #ef4444;
    }
    .new-pipeline {
      border-top: 4px solid #10b981;
    }
    .pipeline-header {
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
      margin-bottom: 15px;
      text-align: center;
    }
    .pipeline-step {
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
      font-size: 11.5px;
      font-weight: 500;
    }
    .pipeline-step.alert {
      background-color: #fef2f2;
      border-color: #fca5a5;
      color: #991b1b;
    }
    .pipeline-step.success {
      background-color: #f0fdf4;
      border-color: #86efac;
      color: #166534;
      font-size: 12.5px;
      font-weight: 600;
    }
    .pipeline-details {
      font-size: 10px;
      color: #64748b;
      text-align: center;
      margin-top: 4px;
      padding: 0 10px;
      line-height: 1.3;
    }
    .pipeline-arrow {
      text-align: center;
      color: #94a3b8;
      margin: 6px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${bodyHtml}
  </div>
</body>
</html>
  `;

  console.log("Writing temporary HTML file...");
  fs.writeFileSync(tempHtmlPath, fullHtml, "utf-8");

  const browserPath = getSystemBrowserPath();
  if (!browserPath) {
    console.error("Error: Chrome or Edge not found. Cannot print to PDF.");
    process.exit(1);
  }

  try {
    console.log("Compiling PDF natively via browser command line...");
    
    // Command format: chrome.exe --headless --disable-gpu --no-sandbox --print-to-pdf="outputPath" "inputPath"
    const cmd = `"${browserPath}" --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfLocalPath}" "${tempHtmlPath}"`;
    console.log(`Executing: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });

    if (fs.existsSync(pdfLocalPath)) {
      console.log("Copying generated PDF to brain folder...");
      fs.copyFileSync(pdfLocalPath, pdfDestPath);
      console.log("PDF generation completed successfully!");
    } else {
      throw new Error("Browser execution completed, but PDF file was not created.");
    }
  } catch (error) {
    console.error("PDF generation failed:", error.message);
    process.exit(1);
  } finally {
    console.log("Cleaning up temporary HTML file...");
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
}

run();
