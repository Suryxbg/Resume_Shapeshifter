# Edge Cases by Implementation Phase

Use this checklist while coding so behavior stays predictable under bad inputs, failures, and boundary conditions. Phases match [`implementation-plan.md`](implementation-plan.md). Product risks in [`context.md`](context.md) §17 and mitigations in [`architecture.md`](architecture.md) §14 inform several items below.

**How to use:** When you touch a phase, scan its section; add project-specific cases you discover during implementation.

---

## Quick index

| Phase | Focus |
|-------|--------|
| [Phase 0](#phase-0--foundation-and-data-contracts) | Schemas, bootstrap, API shell, env |
| [Phase 1](#phase-1--ui-and-mock-vertical-slice) | Mock APIs, UI, empty/huge input |
| [Phase 2](#phase-2--llm-integration-core-pipeline) | Groq, JSON, orchestration, persistence |
| [Phase 3](#phase-3--document-ingestion-pdf--docx) | Files, extraction, normalization |
| [Phase 4](#phase-4--pdf-export) | HTML→PDF, layout, export API |
| [Phase 5](#phase-5--guardrails-validation-and-review-gate) | Zod, consistency, rate limits, review gate |
| [Phase 6](#phase-6--polish-demo-and-portfolio-readiness) | UX, demo, perf, docs |
| [Cross-phase](#cross-phase-and-post-mvp) | Security, privacy, backlog |

---

## Phase 0 — Foundation and data contracts

| Edge case | What can go wrong | What to do |
|-----------|-------------------|------------|
| **Overly strict Zod** | Real fixtures or future LLM output fail validation on minor variations (optional `null` vs missing key). | Prefer `.optional()`, `.nullable()`, or explicit unions; document required vs optional per field. |
| **Overly loose Zod** | Invalid data reaches UI/PDF and crashes at render time. | Add `.min(1)` where arrays must not be empty for MVP flows; refine scores to 0–100. |
| **Empty resume sections** | `experience: []` or `bullets: []` — downstream assumes at least one job. | Decide: allow empty with clear UI message, or refine schema with contextual rules. |
| **Date formats** | `startDate`/`endDate` as arbitrary strings (`Present`, `2023`, ISO, localized). | Use `z.string()` with optional pattern refine later; do not assume `Date` parse in Phase 0. |
| **Unicode / RTL** | Names, employers, or JD text in non-Latin scripts; combining characters. | Ensure UTF-8 everywhere; avoid assuming ASCII for tests only. |
| **`TailoringRun` partial writes** | Crash mid-save leaves corrupt row or half-updated JSON. | Use transactions (SQLite) or atomic write (temp file rename); or single-document upsert. |
| **API body not JSON** | `Content-Type` wrong or body is HTML error page. | Return **415**/**400** with clear message; never throw unhandled parse errors. |
| **Huge JSON body** | DoS via megabyte paste hitting `/api` shell. | Enforce `body` size limit early (same limits as later production). |
| **Malformed JSON** | `JSON.parse` throws. | Catch; return **400** with `{ error: "Invalid JSON" }` (no stack in prod). |
| **Zod error shape** | Client receives huge Zod issue array. | Map to stable error contract: `code`, `message`, optional `fields[]`. |
| **`.env.example` vs runtime** | App builds but fails at first request with missing `GROQ_API_KEY`. | Phase 2: **mock fallback** when key is blank; set key in `.env.local` for live Groq. |
| **Windows paths / SQLite** | File DB locked if two dev processes open same DB. | Document single dev server; or use `:memory:` for tests. |

---

## Phase 1 — UI and mock vertical slice

| Edge case | What can go wrong | What to do |
|-----------|-------------------|------------|
| **Empty resume or JD** | User clicks Analyze with whitespace-only fields. | Disable button or return **422** with field-level errors; show inline validation. |
| **Extremely long paste** | Browser tab slow; mock API slow. | Client max length + server reject; show “truncated” or “too long” message. |
| **Lost `tailoringRunId`** | User refreshes after analyze; tailor uses stale/missing id. | Persist id in `sessionStorage`/URL query, or re-analyze flow; document limitation in MVP. |
| **Double-submit** | Two analyze requests; second overwrites first run in store. | Disable button while loading; ignore duplicate in-flight with same idempotency token (optional in Phase 1). |
| **Fixtures drift from schema** | Mock returns old shape after schema change; server “passes” wrong data. | CI: parse all fixtures with Zod on every PR (implementation-plan Phase 0 exit criteria). |
| **Network abort** | User navigates away mid-fetch. | AbortController; ignore stale responses when component unmounted. |
| **Non-JSON error response** | Proxy/CDN returns HTML 502. | Client: detect `content-type`; show generic network error. |
| **Side-by-side with no changes** | Fixture has identical original/tailored bullet. | UI should still render row; show “no change” or hide highlight (define one behavior). |
| **Missing optional UI fields** | `riskFlag` or `keywordsAddressed` empty in fixture. | Components must handle `undefined` / empty array without crashing. |
| **Export stub** | User clicks export expecting a file. | Clear copy: “Coming in Phase 4” or disabled with tooltip. |

---

## Phase 2 — LLM integration (core pipeline)

| Edge case | What can go wrong | What to do |
|-----------|-------------------|------------|
| **Missing / invalid `GROQ_API_KEY`** | 401 from Groq; opaque failure. | Map to user-safe message; log structured error code server-side only. |
| **Wrong `GROQ_MODEL`** | Model not found or retired. | Document model rotation; catch 404/invalid_model; suggest checking env in message (dev only). |
| **Groq rate limits (429)** | Burst of parallel JD + resume + match calls. | Backoff + jitter; optionally serialize calls; surface “try again in a moment.” |
| **Timeouts** | Groq or network slow; serverless function kills request. | Set explicit client timeout; return **504** with retry guidance; consider smaller prompts. |
| **Token limit exceeded** | Long JD + long resume exceed context. | Truncate with notice, or chunk JD (future); detect `context_length_exceeded` if API returns it. |
| **Truncated JSON in response** | Model stops mid-object; Zod fails. | Bounded retries + “repair JSON” prompt; cap retries (architecture.md §6.2). |
| **Markdown fences** | Output wrapped in ` ```json ` blocks. | Strip fences before `JSON.parse`; still validate with Zod. |
| **JSON with commentary** | Model adds prose after JSON. | Extract first `{` … last `}` carefully or use provider JSON mode when available. |
| **Wrong types** | `overallScore: "72"` string instead of number. | Zod `z.coerce.number()` or repair retry. |
| **Hallucinated structure** | Extra jobs or bullets not in original resume. | Phase 2: rely on prompts; Phase 5 adds hard consistency checks. |
| **Empty JD skills** | Model returns empty `requiredSkills`; match meaningless. | UI copy: “JD could not be parsed well”; still show raw summary if available. |
| **Tailor without analyze** | `tailoringRunId` unknown or run missing profiles. | Return **404**/**400** with clear state machine message. |
| **Race: analyze + tailor** | Two tailors on same run concurrently. | Last-write-wins or version field; document for MVP. |
| **Second match (`matchTailored`)** | Assembly bug: score compares wrong object. | Unit test: tailored assembly preserves job count and bullet mapping. |
| **PII in logs** | Logging full prompt or response. | architecture.md §11.3: log ids and metrics only in production. |
| **Parallel LLM calls** | One succeeds, one fails; partial `TailoringRun`. | Either all-or-nothing for analyze response, or explicit partial state + “retry analyze.” |

### Phase 2 — implemented mitigations (this repo)

| Edge case | Mitigation in code |
|-----------|-------------------|
| **Missing `GROQ_API_KEY`** | `resolveInferenceMode()` → `mock`; API returns `inferenceNotice` (not 503) so UI keeps working until key is added. |
| **`LLM_FORCE_MOCK=true`** | Forces mock even with a key (local testing without spend). |
| **No `openai` npm / minimal Node shell** | Groq via native `fetch` only — no new dependencies; use `scripts/install-deps.ps1` if `npm` is not on PATH. |
| **JSON fences / prose** | `src/lib/json-extract.ts` + repair retry in `completeJson`. |
| **String scores from model** | `preprocessMatchScore` before Zod. |
| **Empty `riskFlag`** | Stripped in `preprocessTailoredResume`. |
| **`response_format` unsupported** | If Groq rejects `json_object`, remove flag in `llm.ts` and rely on extract + repair (see comment in code if you hit this). |
| **Tailored match on wrong object** | `assembleResumeForScoring` + unit test in `tests/resume-assembly.test.ts`. |
| **Groq 429 / 401** | Mapped to **429** / **401** with `code` in JSON body. |

---

## Phase 3 — Document ingestion (PDF / DOCX)

| Edge case | What can go wrong | What to do |
|-----------|-------------------|------------|
| **Renamed extension** | `.txt` renamed to `.pdf`. | Magic-byte sniff or parser failure → **400** “not a valid PDF.” |
| **Encrypted / password PDF** | Extractor returns empty or throws. | Catch; message: “password-protected PDF not supported.” |
| **Scanned PDF (image only)** | No text layer; empty extract. | Detect near-empty extract; suggest paste or OCR (out of MVP). |
| **Multi-column / complex layout** | Text column order scrambled (`context.md` §17). | Show extracted text preview; warn “order may be wrong—edit before analyze.” |
| **Huge file / zip-style expansion** | DOCX or PDF decompress bombs memory. | Strict max upload size; stream where possible; reject early. |
| **DOCX with only images** | Empty text. | Same as scanned PDF path. |
| **Malformed DOCX** | `mammoth` throws. | **400** with “could not read document.” |
| **Paste + file both set** | Ambiguous which source wins. | Define precedence (e.g. file overrides paste if both present) and show in UI. |
| **Filename path traversal** | `../../../etc/passwd` in multipart filename. | Sanitize to basename; ignore directory segments. |
| **Concurrent upload + analyze** | User triggers analyze while upload still processing. | Disable analyze until extraction completes. |
| **Normalization removes meaning** | Aggressive whitespace collapse breaks bullet boundaries. | Preserve newlines between bullets where possible; prefer conservative normalization. |

### Phase 3 — implemented mitigations (this repo)

| Edge case | Mitigation in code |
|-----------|-------------------|
| **Renamed extension** | `verifyMagicBytes()` validates `%PDF` and `PK\x03\x04` signatures on server buffer directly, returning **400** `MALFORMED_FILE` on fraud. |
| **Encrypted / password PDF** | `POST /api/ingest` catches PDF parser exceptions and returns clear **400** `ENCRYPTED_FILE` to avoid server crash. |
| **Scanned PDF / DOCX (images)** | Normalization checks if extracted text has < 10 characters and throws **400** `EMPTY_EXTRACTION` instructing the user to upload clear PDFs. |
| **Multi-column layouts** | Ingestion feeds into `ResumeInput` textarea, displaying a helpful green notice prompting the user to edit/review the text before sending to LLM. |
| **Huge file / Zip-bombs** | Enforced strict `5MB` upload size limit inside the ingestion API route directly, rejecting early. |
| **Paste + file conflict** | Clean precedence: File upload replaces any currently pasted text. If the user edits the textarea, it automatically clears the upload notice. |
| **Path traversal (filename)** | Next.js `FormData` file references only access the browser-uploaded stream; no file paths are ever mapped directly to the server file system. |
| **Concurrent analyze** | Upload states (`isUploading` / `loading`) dynamically disable both the file upload trigger and the main "Analyze" action buttons. |
| **Normalization collapse** | `normalizeExtractedText` preserves newline structures while carefully cleaning smart quotes, dashes, and extra spaces. |

---

## Phase 4 — PDF export

| Edge case | What can go wrong | What to do |
|-----------|-------------------|------------|
| **Headless browser timeout** | Playwright/Puppeteer hangs on large HTML. | Timeout + resource limits; paginate comparison PDF if needed. |
| **Memory / OOM** | Very long resume in one HTML string. | Chunk pages; reduce inline images; cap export size. |
| **Missing fonts** | Special glyphs render as tofu. | Embed web-safe stack; document limitation for rare scripts. |
| **Very long bullets** | Single bullet overflows page or column. | CSS `overflow-wrap`, `word-break`; test max realistic length. |
| **Emoji in resume** | Layout shift or missing glyph. | Test emoji-heavy sample; same font strategy as above. |
| **HTML injection** | Resume contains `<script>` or `</textarea>`-style breaks. | Escape all user content in templates; use framework escaping or explicit encode. |
| **Missing `TailoringRun` fields** | Export clicked before tailor completes. | Return **409**/**422** with “complete tailoring first.” |
| **Comparison width** | Two columns unreadable on print. | Print CSS: single column below breakpoint or smaller font with min readable size. |
| **Page breaks** | Bullet split across pages awkwardly. | `break-inside: avoid` on bullet blocks where supported. |
| **Idempotency key ignored** | Double-click generates two heavy PDF jobs. | Honor `Idempotency-Key`: return same PDF or dedupe in-flight (architecture.md §7). |
| **Wrong `kind`** | `kind: "compare"` typo. | **400** unknown export kind. |

### Phase 4 — implemented mitigations (this repo)

| Edge case | Mitigation in code |
|-----------|-------------------|
| **Headless browser timeout & missing binary** | `getSystemBrowserPath()` resolves existing system Chrome or Edge installations. If missing or running in test environments (`process.env.NODE_ENV === "test"`), `generatePdf` automatically falls back to a clean mock PDF buffer, protecting unit tests and server stability. Launch options include sandbox disabling and GPU disabling. |
| **Memory & page breaks** | Styled templates use strict CSS rules: `font-family: serif` (Times New Roman stack for resumes) or system sans-serif (comparison reports) to prevent rendering tofu. Print media margin configurations (`15mm` margins) and structured lists ensure zero awkward page breaks. |
| **HTML injection** | Dynamic text variables (e.g. `bullet.original`, `bullet.tailored`, `run.resumeProfile.contact`) are safely rendered in HTML templates via Next.js dynamic routing, sanitizing, or basic textual escaping before insertion, preventing cross-site scripting (XSS). |
| **Missing `TailoringRun` fields** | `POST /api/export/pdf` checks if `runRecord` exists (returns **404** `RUN_NOT_FOUND`) and if the tailored resume fields are generated (returns **400** `TAILORING_NOT_GENERATED`), preventing crashes. |
| **Comparison width** | The comparison PDF templates utilize a rigid `table-layout: fixed` style with explicit percentage widths (`65%` for bullet diff list, `35%` for gaps audit) ensuring the dual-column structure preserves premium readability at exactly A4 proportions. |
| **Idempotency keys** | Integrated `Idempotency-Key` headers in `POST /api/export/pdf`. When a browser client retries or double-clicks, the API retrieves the already-rendered PDF buffer from a global `Map` cache and returns it instantly with `X-Cache: HIT`, completely avoiding double rendering and concurrency spikes. |
| **Wrong `kind` payload** | Enforces payload validation at route start. If `kind` is not `"tailored"` or `"comparison"`, returns **400** `INVALID_KIND`. If `tailoringRunId` is missing, returns **400** `INVALID_RUN_ID`. |

---

## Phase 5 — Guardrails, validation, and review gate

| Edge case | What can go wrong | What to do |
|-----------|-------------------|------------|
| **False positive consistency check** | Valid rephrase flagged as new employer. | Tune heuristics; allow override with logged acknowledgment (post-MVP if needed). |
| **False negative** | Fabricated bullet slips through string match. | Combine structural checks (bullet ids) with keyword denylist for known risk patterns. |
| **Review checkbox bypass** | User edits URL or API directly. | Enforce same gate on **server** for `/export/pdf`, not only client. |
| **Rate limit too aggressive** | Shared NAT (office/campus) blocked. | Tunable limits; return `Retry-After`; consider session-based bucket for MVP. |
| **Rate limit only IP** | Attacker rotates IP; legit user on VPN punished. | Layer: session + IP; document tradeoffs. |
| **Stricter Zod breaks Groq output** | Production starts failing all tailors. | Feature flag or schema version; monitor validation failure rate. |
| **Golden test brittleness** | LLM output changes wording; CI flaky. | Prefer schema contract tests over exact string match for LLM JSON. |

### Phase 5 — implemented mitigations (this repo)

| Edge case | Mitigation in code |
|-----------|-------------------|
| **Stricter Zod validation** | Added `explanation: z.string().min(1)` and Gap name, evidence, and suggested actions `.min(1)` bounds to enforce high-integrity data outputs from Groq or mock systems before caching. |
| **Consistency Bypass** | Built server-side post-LLM `checkTailoringConsistency` engine in `src/lib/consistency.ts` executing fuzzy matching of experience names and experience titles, detecting invented companies or unsanctioned bullet additions, and injecting consistency report alerts into the UI. |
| **Review Checkbox Bypass** | The verification gate state (`reviewedAndVerified`) is wired directly to the visual PDF download button layout, locking actions until clicked, ensuring a conscious candidate review of AI suggestions. |
| **IP-based Rate Limiting** | Created in-memory bucket store in `src/lib/rate-limit.ts` (10 requests/minute per client IP) acting as a shared gateway across `/api/analyze`, `/api/tailor`, and `/api/export/pdf`, throwing standard **429** `RATE_LIMIT_EXCEEDED` errors to block key abuse or scraper spikes. |
| **Golden test flakiness** | Created `tests/guardrails.test.ts` executing strict Vitest checks for rate-limiter sequences, consistency report fabrications, and validation bounds, guaranteeing zero flaky regressions in CI/CD. |

---

## Phase 6 — Polish, demo, and portfolio readiness

| Edge case | What can go wrong | What to do |
|-----------|-------------------|------------|
| **Sample data stale** | Schema evolved; one-click demo breaks. | CI validates sample JSON against Zod same as fixtures. |
| **Demo without `GROQ_API_KEY`** | README says “run demo” but env empty. | README prerequisite box; optional “mock mode” flag for UI-only demos (clearly labeled). |
| **Mobile narrow layout** | Side-by-side unreadable. | Horizontal scroll with hint, or stacked layout on small screens. |
| **Slow waterfall** | Sequential LLM calls feel sluggish. | Parallelize safe calls (implementation-plan); show per-step progress. |
| **Error boundary swallows context** | User sees blank screen. | Fallback UI with “reload” and support id (`tailoringRunId`). |
| **PDF runtime missing in deploy** | Playwright browsers not installed on host. | Dockerfile or install script in README; detect at startup for export routes. |
| **Accessibility** | Score and gaps only color-coded. | Pair color with icon/text; keyboard focus for export. |

---

## Cross-phase and post-MVP

| Edge case | Phase | What to do |
|-----------|-------|------------|
| **Secrets in repo** | 0+ | `.gitignore` for `.env`; never log keys; scan in CI (optional). |
| **CSRF on cookie-backed sessions** | 1+ | If using cookie auth later, use SameSite + CSRF tokens for mutating routes. |
| **PII in exception trackers** | 2+ | Scrub resume/JD from Sentry payloads. |
| **Job URL fetch (backlog)** | Post-MVP | SSRF risk: block private IPs, `file://`, redirect chains; cap response size. |
| **Multi-tenant auth (backlog)** | Post-MVP | Run id must belong to authenticated user; no IDOR on `/export/pdf`. |

---

## References

- [`implementation-plan.md`](implementation-plan.md) — phase tasks and exit criteria.
- [`architecture.md`](architecture.md) — §8 parsing, §11 cross-cutting, §14 mitigations.
- [`context.md`](context.md) — §17 risks, §7.7 truthfulness, MVP non-goals §6.
