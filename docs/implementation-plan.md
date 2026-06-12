# Resume Shapeshifter — Phase-Wise Implementation Plan

This plan implements the system described in [`architecture.md`](architecture.md) and the product requirements in [`context.md`](context.md). Phases align with **architecture.md §13** and expand them into **sequenced work**, **deliverables**, **dependencies**, and **exit criteria**.

---

## Guiding principles

1. **Vertical slice first** — One path: paste resume + JD → analyze → tailor → preview → export PDFs, using real schemas end-to-end (architecture.md §1, §3).
2. **Contracts before features** — Zod schemas and `TailoringRun` envelope are the integration spine (architecture.md §5, §5.6).
3. **Server-side secrets** — LLM and PDF run only on the server (architecture.md §11.1).
4. **Same JSON in mock and live modes** — Phase 1 uses fixtures that validate against the same schemas as Phase 2+ (architecture.md §13 Phase 1).
5. **Progress tracking** — After completing each phase, update [`progress.md`](progress.md) (summary table + phase section).

---

## Phase map (summary)

| Phase | Name                     | Primary outcome                                                          |
| ----- | ------------------------ | ------------------------------------------------------------------------ |
| 0     | Foundation               | Repo, stack, schemas, mock pipeline, no LLM                              |
| 1     | UI + mock vertical slice | All screens + `POST /analyze` / `POST /tailor` returning **fixtures**    |
| 2     | LLM pipeline             | Real parsers, match, tailor, gaps; `TailoringRun` persisted in MVP store |
| 3     | Ingestion + files        | PDF/DOCX extraction, normalization, limits                               |
| 4     | PDF export               | Tailored PDF + comparison PDF per architecture.md §4.9                   |
| 5     | Guardrails + validation  | Consistency checks, retries, review gate, stronger Zod                   |
| 6     | Polish + demo            | UX, samples, observability, rate limits, performance                     |

_Phases 3 and 4 can be partially reordered:_ you may start HTML→PDF with **text-only** resumes (Phase 4 subset) before full binary ingestion, as long as the **final** milestone includes PDF/DOCX per product spec.

---

## Phase 0 — Foundation and data contracts

**Goal:** Establish the recommended stack and **canonical types** so every later phase plugs into the same contracts (architecture.md §5, §12).

### Tasks

1. **Bootstrap application**
   - Next.js (App Router), TypeScript, Tailwind, ESLint/Prettier.
   - Optional: Shadcn UI init for forms, cards, dialogs.

2. **Define Zod modules** (split files if preferred: `schemas/resume.ts`, `schemas/jd.ts`, etc.)
   - `ResumeProfile`, `JobDescriptionProfile`, `MatchScore`, `TailoredResume`, `GapAnalysis`, `TailoringRun` (architecture.md §5.1–5.6).
   - Export inferred TypeScript types from Zod.

3. **Repository skeleton** (architecture.md §12)
   - `lib/schemas.ts` (or `schemas/` barrel).
   - `prompts/` directory (empty or stub exports).
   - `components/` placeholders.

4. **Environment and config**
   - `.env.example`: **`GROQ_API_KEY`** (placeholder), **`GROQ_MODEL`** (a Groq model id from the Groq console; pick one that fits JSON-heavy prompts), optional PDF-related flags (architecture.md §11.4).
   - Document that **no** secrets are committed.

5. **Minimal API shell** (no LLM)
   - Route handlers that parse JSON body and return **422** on Zod failure.
   - In-memory store or SQLite schema for `TailoringRun` (architecture.md §10) — can be deferred to Phase 1 if you prefer a single PR.

### Exit criteria

- `pnpm`/`npm` build passes; types strict.
- Golden **fixture JSON** files under `tests/fixtures/` (or `lib/__fixtures__/`) validate against all schemas.
- No LLM calls yet.

### Architecture touchpoints

§5 Data contracts, §12 repo layout, §10 storage (stub).

---

## Phase 1 — UI and mock vertical slice

**Goal:** Full **user journey** with **mock** analyze/tailor data flowing through real UI components and APIs (architecture.md §13 Phase 1, §4.1).

### Tasks

1. **Pages / routes**
   - Landing (trust copy: truthfulness, user review).
   - Input: resume (textarea MVP) + JD (textarea).
   - Analysis: JD summary card, requirements list, **original** `MatchScore`, `GapAnalysis` preview.
   - Tailoring review: side-by-side original vs tailored bullets with metadata columns (reason, keywords, confidence, risk).
   - Export page or section: buttons wired to stub downloads or “coming soon” with clear state.

2. **Components** (architecture.md §12)
   - `ResumeInput`, `JDInput`, `ScoreCard`, `GapAnalysis`, `SideBySideDiff`, `PDFExportButton` (button may noop or hit stub endpoint).

3. **Mock API implementation**
   - `POST /api/analyze` — accepts resume text + JD text; returns valid objects: `resumeProfile`, `jobDescriptionProfile`, `matchOriginal`, `gapAnalysis` (fixtures merged or lightly transformed).
   - `POST /api/tailor` — returns `tailoredResume`, `matchTailored`, refreshed `gapAnalysis` (fixtures).
   - Persist or return a `tailoringRunId` if using server session store (architecture.md §7, §10).

4. **Client integration**
   - Typed fetch/server actions; handle loading and error states minimally.

### Exit criteria

- Demo walkthrough without LLM: paste → analyze → tailor → side-by-side visible.
- All API responses pass Zod parse on server before respond.
- Matches acceptance flow in `context.md` §12 (minus real PDF and real scores).

### Dependencies

- Phase 0 complete.

### Architecture touchpoints

§4.1 Frontend, §7 API (`/analyze`, `/tailor` stubs), §3 pipeline (mocked).

---

## Phase 2 — LLM integration (core pipeline)

**Goal:** Replace mocks with **real** JD extraction, resume structuring, scoring, bullet rewriting, and gap analysis behind the same routes (architecture.md §3, §6, §13 Phase 2). **All inference uses Groq** with a server-side API key (architecture.md §6).

### Tasks (recommended order)

1. **Shared LLM client** (`lib/llm.ts` or similar)
   - Server-only **`GROQ_API_KEY`**; base URL `https://api.groq.com/openai/v1` when using an OpenAI-compatible client.
   - JSON-mode / structured output when supported by **`GROQ_MODEL`**; otherwise strict JSON in prompts plus Zod parse and retries.
   - **Bounded retries** on schema validation failure with repair prompt (architecture.md §6.2).

2. **Prompt modules** (architecture.md §6.1)
   - `prompts/jd-extraction.ts` → `JobDescriptionProfile`.
   - `prompts/resume-parser.ts` → `ResumeProfile` (from normalized text).
   - `prompts/match-scoring.ts` → `MatchScore`.
   - `prompts/bullet-rewriter.ts` → `TailoredResume` (focus bullets first).
   - `prompts/gap-analysis.ts` → `GapAnalysis`.
   - Central **global truthfulness** system block reused by all prompts (architecture.md §6.3).

3. **Orchestration**
   - `POST /analyze`: normalize text → parallel or sequential JD + resume LLM calls → `match` + initial `gaps` (architecture §3: ParseR, ParseJ, Match, Gaps).
   - `POST /tailor`: invoke tailor using stored profiles; compute `matchTailored` (second match run on assembled tailored view — architecture.md §4.5); optionally refresh gaps.

4. **Resume assembly** (architecture.md §4.8)
   - Pure function: merge `ResumeProfile` + `TailoredResume` into render model used by UI and later PDF.
   - Document which fields are “source of truth” from original vs tailored.

5. **Persistence**
   - Store full `TailoringRun` by id (SQLite or session store) for tailor/export continuity (architecture.md §5.6, §10).

6. **Observability baseline** (architecture.md §11.3)
   - Log `tailoringRunId`, stage, latency, success/fail; **no** full resume body in production logs.

### Exit criteria

- Real JD + pasted resume produces validated pipeline output end-to-end in UI.
- Original and tailored scores both shown with explanations.
- User-visible error when LLM output fails validation after retries.

### Dependencies

- Phase 1 complete (UI and routes exist).

### Architecture touchpoints

§4.3–4.7 components, §6 LLM layer, §7 API, §11.2 validation boundaries.

---

## Phase 3 — Document ingestion (PDF / DOCX)

**Goal:** Implement **architecture.md §4.2** and **§8**: binary uploads, text extraction, normalization, size limits.

### Tasks

1. **Upload API**
   - Multipart handling; max size; MIME allowlist (PDF, DOCX).
   - Optional: virus scanning hook / placeholder for future.

2. **Extractors**
   - PDF: e.g. `pdf-parse` (or Python worker if you chose FastAPI split — architecture.md §3 physical mapping).
   - DOCX: e.g. `mammoth` → HTML or plain text → normalize.

3. **Normalization pipeline**
   - Encoding, whitespace, obvious noise; retain raw hash for idempotency (architecture.md §4.2).

4. **UI**
   - File upload alongside paste; show extracted text preview with **edit before analyze** (architecture.md §8 mitigates parse risk).

5. **Wire to Phase 2**
   - Extracted text feeds the same `resume-parser` LLM path as paste.

### Exit criteria

- User can upload PDF or DOCX **or** paste text; analyze path unchanged from API consumer’s perspective.
- Failures (corrupt file, empty extract) return clear errors.

### Dependencies

- Phase 2 complete (or parallelizable after Phase 2 resume path works for plain text).

### Architecture touchpoints

§4.2 Ingestion, §8 diagram, §14 parse risks.

---

## Phase 4 — PDF export

**Goal:** Deliver both PDF artifacts (architecture.md §4.9, §9).

### Tasks

1. **HTML templates**
   - **Tailored resume** — single-column, ATS-friendly typography.
   - **Comparison** — header (job title, company), scores before/after, JD summary, two-column bullets, visual diff for changed lines, gap summary, disclaimer.

2. **PDF engine**
   - Implement Puppeteer-core execution for high-fidelity HTML-to-PDF rendering (runs successfully under Docker or local platforms with a resolved Chrome/Chromium executable).
   - Implement a serverless-friendly plain text PDF generator fallback (`generateValidMockPdf`) using programmatic PDF 1.4 stream rendering. When launched on browserless platforms like Vercel, it formats the sections/comparisons into text layout blocks and compiles them directly to PDF bytes, preventing OOM/crashing.

3. **`POST /export/pdf`** (architecture.md §7)
   - Body: `tailoringRunId`, `kind: "tailored" | "comparison"`.
   - **Idempotency-Key** header support (architecture.md §7).
   - Stream PDF or return short-lived signed URL pattern (if using object storage later).

4. **UI**
   - `PDFExportButton` triggers download; loading and error states.

5. **Metadata** (optional)
   - Record `ExportedDocument` row or log line (architecture.md §10 entities).

### Exit criteria

- `context.md` §7.8 and architecture.md §15 Definition of Done: comparison PDF includes all required sections.
- Tailored-only PDF suitable for submission draft (user still responsible for verification).
- PDF generation handles serverless environment (e.g. Vercel) gracefully by yielding clean plain text formatted PDF binary fallbacks.

### Dependencies

- Phase 2 (real `TailoringRun`); Phase 3 optional if export restricted to text-derived runs initially.

### Architecture touchpoints

§4.9, §9, §7 export route.

---

## Phase 5 — Guardrails, validation, and review gate

**Goal:** Harden **architecture.md §4.8, §11.2, §14** before calling the MVP “done.”

### Tasks

1. **Stronger Zod**
   - Stricter string length enums for `confidence`, `importance`; optional refinements (e.g. scores 0–100).

2. **Post-LLM consistency checks**
   - Every tailored bullet maps to an existing experience index/id from `ResumeProfile`.
   - No new employers/degrees/certifications in tailored JSON vs original (heuristic + schema).

3. **Unsupported-claim / risk surfacing**
   - Promote `riskFlag` and low-confidence items in UI; optional “acknowledge” checkbox before export.

4. **Scoring UX**
   - Label scores as **heuristic**; always show sub-scores + explanation (architecture.md §14).

5. **Rate limiting** (architecture.md §11.1)
   - Per-IP or per-session limits on `/analyze`, `/tailor`, `/export`.

6. **Tests**
   - Contract tests for schemas; golden LLM outputs (redacted) in CI if feasible.

### Exit criteria

- Export path blocked or strongly warned until user confirms review (product intent in `context.md` §7.7 / §8 flow).
- Documented failure modes for invalid JSON and mapping violations.

### Dependencies

- Phases 2 and 4 complete.

### Architecture touchpoints

§11.1–11.2, §14.

---

## Phase 6 — Polish, demo, and portfolio readiness

**Goal:** **architecture.md §13 Phase 5** + `context.md` §13 demo and §14 quality bar.

### Tasks

1. **UX**
   - Loading skeletons, toasts, empty states, mobile-friendly layout for review screen.

2. **Sample data**
   - Built-in sample resume + sample JD for one-click demo.

3. **Performance**
   - Debounce, parallelize independent LLM calls where safe; cache JD profile if only resume changes.

4. **Documentation**
   - README: setup, env vars, how to run demo.
   - Optional: screen recording script aligned with `context.md` §13.

5. **Hardening**
   - Error boundaries; graceful degradation if PDF runtime fails.

### Exit criteria

- Meets `context.md` §19 Definition of Done and architecture.md §15 (full `TailoringRun` + both PDFs + disclaimers).
- Polished enough to share as portfolio project.

### Dependencies

- Phases 0–5 complete.

### Architecture touchpoints

§1 goals, §16 references.

---

## Optional backlog (post-MVP)

Not required for initial phases; trace to **non-goals** / future in `context.md` and architecture.md §1:

- Job posting **URL** fetch and text extraction.
- Markdown/DOCX export.
- Auth and multi-user persistence (Supabase/Postgres).
- Coach / org features.

---

## Milestone checklist (quick reference)

| #   | Milestone                                      | Phase |
| --- | ---------------------------------------------- | ----- |
| 1   | Schemas + fixtures validate in CI              | 0     |
| 2   | Full UI with mock APIs                         | 1     |
| 3   | Live analyze + tailor + gaps + dual scores     | 2     |
| 4   | PDF/DOCX upload path                           | 3     |
| 5   | Both PDFs downloadable                         | 4     |
| 6   | Review gate + consistency checks + rate limits | 5     |
| 7   | Demo-ready polish + README                     | 6     |

---

## References

- [`architecture.md`](architecture.md) — components, APIs, schemas, PDF spec, risks.
- [`context.md`](context.md) — MVP scope, acceptance criteria, original five-phase sketch (§15).
- [`edge-case.md`](edge-case.md) — edge cases and failure modes **by phase** for implementation and review.
- [`progress.md`](progress.md) — phase completion log (update after each phase).
