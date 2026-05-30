# Implementation progress

Update this file **after completing each phase** in [`implementation-plan.md`](implementation-plan.md).  
Edge cases to watch while coding: [`edge-case.md`](edge-case.md).

---

## Summary

| Phase | Name                                | Status   | Last updated |
| ----- | ----------------------------------- | -------- | ------------ |
| 0     | Foundation and data contracts       | **Done** | 2026-05-19   |
| 1     | UI + mock vertical slice            | **Done** | 2026-05-19   |
| 2     | LLM integration (Groq)              | **Done** | 2026-05-19   |
| 3     | Document ingestion (PDF / DOCX)     | **Done** | 2026-05-19   |
| 4     | PDF export                          | **Done** | 2026-05-19   |
| 5     | Guardrails, validation, review gate | **Done** | 2026-05-19   |
| 6     | Polish + demo                       | **Done** | 2026-05-19   |

---

## Phase 0 — Foundation and data contracts

**Status:** Done

**What was implemented**

- Next.js 15 (App Router), TypeScript (strict), Tailwind CSS, ESLint, Prettier.
- Canonical Zod schemas and inferred types under `src/schemas/`.
- Golden JSON fixtures + Vitest contract tests.
- API shell: `POST /api/validate`, `POST /api/runs`, `GET /api/runs/[id]`.
- In-memory run store (`src/lib/run-store.ts`).
- `.env.example` for Groq variables.

---

## Phase 1 — UI and mock vertical slice

**Status:** Done

**What was implemented**

- Landing (`/`) and tool flow (`/tool`) with components: `ResumeInput`, `JDInput`, `ScoreCard`, `GapAnalysis`, `SideBySideDiff`, `PDFExportButton`, `ToolFlow`.
- Mock `POST /api/analyze` and `POST /api/tailor` with Zod-validated responses.

---

## Phase 2 — LLM integration (core pipeline)

**Status:** Done

**What was implemented**

- **Groq client (no extra npm package):** `src/lib/llm.ts` uses native `fetch` against `https://api.groq.com/openai/v1` with `response_format: json_object`, timeouts, and bounded retries + JSON repair prompts.
- **Config:** `src/lib/llm-config.ts` — `GROQ_API_KEY`, `GROQ_MODEL` (default `llama-3.3-70b-versatile`), `LLM_FORCE_MOCK`. **Empty key → automatic mock fallback** (UI shows `inferenceNotice`).
- **Prompts:** `src/prompts/` — truthfulness block, JD extraction, resume parser, match scoring, bullet rewriter, gap analysis, JSON repair.
- **Pipeline:** `src/lib/pipeline/analyze.ts`, `src/lib/pipeline/tailor.ts` — parallel JD + resume parse on analyze; tailor runs rewrite then match + gaps on **assembled** resume (`src/lib/resume-assembly.ts`).
- **Preprocess:** `src/lib/llm-preprocess.ts` — coerce string scores; normalize empty `riskFlag`.
- **Observability:** `src/lib/pipeline-logger.ts` — structured `[pipeline]` logs (run id, stage, duration; no resume/JD body).
- **Routes:** `POST /api/analyze` and `POST /api/tailor` call pipelines; responses include optional `inferenceMode` + `inferenceNotice`.
- **Errors:** `src/lib/pipeline/errors.ts` — maps Groq 401/429/502/504 to stable API codes.
- **Tests:** `tests/json-extract.test.ts`, `tests/resume-assembly.test.ts`, `tests/llm-config.test.ts`.
- **npm workaround:** `scripts/install-deps.ps1` locates `npm.cmd` when not on PATH; README updated.

**Setup (when you have a Groq key)**

```bash
cp .env.example .env.local
# Set GROQ_API_KEY=gsk_... and optionally GROQ_MODEL
```

**Verification (local)**

```bash
.\scripts\install-deps.ps1   # or: npm install
npm run test
npm run build
npm run dev
```

- Without key: `/tool` works in **mock** mode (amber banner).
- With key: same flow uses **groq** for parse, score, gaps, rewrite, and second score.

**Notes / follow-ups for Phase 3**

- File upload feeds the same analyze pipeline after text extraction.
- Consider persisting runs to SQLite if in-memory store is insufficient for production.

---

## Phase 3 — Document ingestion (PDF / DOCX)

**Status:** Done

**What was implemented**

- **Binary Text Extraction:** Integrated `pdf-parse` (for PDF) and `mammoth` (for DOCX) to extract raw text on the server.
- **Normalization Pipeline:** Built `normalizeExtractedText` in `src/lib/ingest.ts` which replaces smart curly quotes, converts en/em dashes, trims whitespace on every line, and collapses three or more consecutive newlines into a maximum of two (preserving paragraph layout boundaries).
- **Ingestion API:** Created `POST /api/ingest` with strict constraints:
  - Enforced **5MB file size limit**.
  - MIME type allowlist (`application/pdf`, `.docx`).
  - **Magic-Byte Sniffing:** Validates PDF and ZIP/DOCX headers (`%PDF` and `PK\x03\x04`) to prevent renamed extension attacks.
  - Returns clear error codes for password-protected, encrypted, corrupted, or scanned empty files.
- **Aesthetic UI Upload Component:** Designed `ResumeUpload.tsx` with a dashed interactive drag-and-drop boundary, glow hover transitions, extraction animations, green check details upon success, and clean warnings on error.
- **Tool Flow Integration:** Embedded `ResumeUpload` directly above the `ResumeInput` textarea in `ToolFlow.tsx`. Successfully extracted text populates the text field and displays a green notification guiding the user to review and edit the text. This perfectly mitigates document layout parsing risks.
- **Type-safe completeJson Output:** Improved TypeScript type safety for LLM results in `src/lib/llm.ts` to enforce Zod output inference (`z.infer<T>`) rather than input types.
- **Automated Tests:** Added 9 unit tests under `tests/ingest.test.ts` mocking binary buffers and testing normalization constraints. All 21 tests pass successfully.
- **Self-contained Node/npm:** Downloaded Node.js portable zip (`node-v20.12.2-win-x64`) to the workspace to enable standard npm script execution without global environment limits.

---

## Phase 4 — PDF export

**Status:** Done

**What was implemented**

- **Server-Side PDF Engine:** Integrated `puppeteer-core` to perform server-side rendering of PDF documents using the host machine's globally installed Chrome or Edge executable. This completely bypasses the need to download massive browser binaries during installation.
- **Elegantly Styled HTML Templates (`src/lib/pdf.ts`):**
  - **ATS-Tailored Resume PDF:** Elegant, single-column document using classic serif typography designed to pass parsing criteria for corporate tracking systems. Includes Candidate contact, Summary, core competencies/skills, professional Experience (looks up dates from the original profile), and other key categories (Projects, Education, Certifications) from the original resume.
  - **Insights & Comparison PDF:** Premium dual-column audit report displaying Job Title, Company, heuristics match score gains (Original Match vs. Tailored Match overall scores), Target JD requirements summary (Seniority, Skills, Responsibilities), side-by-side original vs. tailored experience bullet diffs (highlighting confidence and change reasons), detailed gap priority audit, and a professional validation disclaimer.
- **Export API endpoint (`POST /api/export/pdf`):** Resolves target `TailoringRun` records, builds the chosen PDF template kind (`"tailored" | "comparison"`), and streams binary documents back.
- **Idempotency-Key Caching:** Checks and echoes `Idempotency-Key` headers, storing completed PDF buffers in an in-memory cache to prevent redundant Chrome engine launches for repeated downloads.
- **Interactive UI Export Buttons:** Refactored `PDFExportButton.tsx` to handle dynamic fetch calls, idempotency headers, dynamic progress/generation spinning feedback, and comprehensive error alerts.
- **Automated Tests:** Added 8 robust Vitest tests covering template generation, browser engine fallback verification, parameter validation, and full idempotency cache hit/miss flows.

---

## Phase 5 — Guardrails, validation, and review gate

**Status:** Done

**What was implemented**

- **Stronger Zod Schemas:** Refined Gap importance schemas, Match score limits, and non-empty string constraints (`.min(1)`) on critical identifier fields.
- **In-Memory Rate Limiter (`src/lib/rate-limit.ts`):** Enforces a 10 requests/minute client IP rate limiter (applied across critical `/api/analyze`, `/api/tailor`, and `/api/export/pdf` endpoints), returning `429 Too Many Requests` with dynamic standard headers (`Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`).
- **Server-Side Consistency Audit Engine (`src/lib/consistency.ts`):** Fuzzy comparison model auditing tailored companies and experience bullet points against the original candidate profile, catching fabrication anomalies and hallucinations.
- **Review Gate & Verification UI (`ToolFlow.tsx`):** Added a mandatory "Accuracy Verification Gate" in the client UI locking PDF downloads until active; dynamically scans and surfaces low-confidence AI rewrites and consistency warnings to the candidate.
- **Heuristic Match Score Card (`ScoreCard.tsx`):** Custom styling and hover warning labeling clearly marking scores as heuristic approximations.
- **Automated Tests (`tests/guardrails.test.ts`):** Created 4 new Vitest tests verifying rate-limiter sequences, consistency validations, and schema boundary validations.
- **Clean Production Build:** Resolved all lint and TypeScript checks with zero compilation errors (succeeded Next.js production build check).

---

## Phase 6 — Polish + demo

**Status:** Done

**What was implemented**

- **Sample Data & Demo Flow:** Added `src/lib/sample-data.ts` containing a realistic software engineer resume and target Job Description. Integrated a "Load sample data" one-click button in the UI (`ToolFlow.tsx`) to let users experience the complete flow instantly without needing an API key (using mock fallbacks) or typing any text.
- **UX Polish:** Transformed simple loading text into elegant visual loading spinners (`animate-spin`) embedded directly inside the action buttons for better interactivity feedback.
- **Documentation:** Updated `README.md` to fully reflect the capabilities of the portfolio project, highlighting key features (ingestion, tailoring, guardrails, PDF generation) and laying out clear steps for running the one-click demo.
- **Hardening:** Confirmed robust parallelization of LLM queries using `Promise.all` in `analyze.ts` and `tailor.ts` for max performance. Confirmed error boundary rendering and graceful alert degradation mechanisms inside `PDFExportButton.tsx` and the core pipeline.

## Changelog (optional)

| Date       | Phase | Note                                                                                                    |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------- |
| 2026-05-19 | 0     | Initial repo bootstrap per implementation plan.                                                         |
| 2026-05-19 | 1     | Mock analyze/tailor APIs, `/tool` flow, components.                                                     |
| 2026-05-19 | 2     | Groq pipeline via fetch; mock fallback without API key; assembly + tests.                               |
| 2026-05-19 | 3     | PDF/DOCX ingestion API, magic byte checks, interactive upload UI, tests.                                |
| 2026-05-19 | 4     | PDF engine via local system Chrome/Edge, tailored & comparison HTML templates, export API, idempotency. |
| 2026-05-19 | 5     | Stronger schemas, IP-based rate limiting, post-LLM consistency audits, required review checkbox, tests. |
