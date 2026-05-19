# API Token & Usage Guide

## 1. Where the Groq API key is used

| File / Module | Purpose | How the key is accessed |
|---|---|---|
| `src/lib/llm-config.ts` | Reads `GROQ_API_KEY` from `.env` and provides helper `getGroqApiKey()` | `process.env.GROQ_API_KEY` (populated by Next.js at runtime) |
| `src/lib/llm.ts` | Core wrapper around the Groq **Chat Completion** endpoint (`/chat/completions`). All LLM calls flow through the `groqChatCompletion` function which injects the key in the `Authorization` header. |
| `src/lib/pipeline/analyze.ts` | Runs the **analysis** pipeline (resume parsing, JD extraction, original match scoring, gap analysis). Each stage calls `completeJson` → `groqChatCompletion`. |
| `src/lib/pipeline/tailor.ts` | Runs the **tailoring** pipeline (bullet rewriting, tailored match scoring, gap analysis). Each stage also uses `completeJson` → `groqChatCompletion`. |
| `src/lib/pipeline/export/pdf.ts` (via `src/lib/pdf.ts`) | **Does NOT** use the Groq API – it only launches a local headless browser to generate PDFs. |
| Tests (`tests/**/*.test.ts`) | When `process.env.PDF_FORCE_MOCK` or `process.env.NODE_ENV === "test"` is set, `src/lib/llm.ts` falls back to **mock mode** and **does NOT** contact Groq. |

## 2. Token consumption per end‑to‑end run

A full user flow (`Upload → Analyze → Generate Tailored Resume → Export PDF`) triggers **seven** separate LLM calls:

| Pipeline stage | Prompt type | Approx. token count (input + output) |
|---|---|---|
| **Resume parsing** (`buildResumeParserMessages`) | Structured resume → JSON | ~800 tokens |
| **JD extraction** (`buildJdExtractionMessages`) | Job posting → JSON | ~600 tokens |
| **Original match scoring** (`buildMatchScoringMessages`) | Resume JSON + JD JSON → scores | ~500 tokens |
| **Gap analysis** (`buildGapAnalysisMessages`) | Resume JSON + JD JSON → gaps | ~500 tokens |
| **Bullet rewriting** (`buildBulletRewriterMessages`) | Resume JSON + JD JSON → tailored resume | ~1000 tokens |
| **Tailored match scoring** (`buildMatchScoringMessages`) | Tailored resume JSON + JD JSON → scores | ~500 tokens |
| **Tailored gap analysis** (`buildGapAnalysisMessages`) | Tailored resume JSON + JD JSON → gaps | ~500 tokens |
| **Total** | | **~4,400 tokens** per run (approx.) |

> **Note:** These numbers are averages for a typical 2‑page resume and a 1‑page job description. Very long inputs will push the totals higher (the `capInputText` helper already trims input to a safe size).

## 3. How to dramatically reduce token usage

1. **Switch to a smaller, cheaper model** – already done by using `llama-3.1-8b-instant` instead of `llama-3.3-70b‑versatile`. The token cost per 1 k tokens is about **5× lower**.
2. **Enable mock mode for development** – set either:
   ```
   LLM_FORCE_MOCK=true   # forces all LLM calls to use fixture data
   ```
   or run tests with `NODE_ENV=test`. No tokens are spent.
3. **Cache results** – the API already uses `Idempotency-Key` for PDF export, but you can extend caching to the analysis pipeline by storing the `tailoringRunId` results in a persistent store (e.g., a simple JSON file). Subsequent identical inputs can skip the LLM calls.
4. **Trim inputs aggressively** – the `capInputText` utility currently caps resume and JD text length. If you notice high token counts, lower the cap (e.g., from 5 k to 3 k characters) in `src/lib/text-limits.ts`.
5. **Skip optional steps** – for quick previews you can disable the **gap‑analysis** stage in `runTailorPipeline` by adding a query flag (`?skipGaps=1`). This removes 2 LLM calls (gap analysis for original and tailored). 
6. **Reduce retries** – `MAX_RETRIES` in `src/lib/llm.ts` is set to `2`. If your prompts are reliable, you could set it to `1` to avoid extra calls on recoverable JSON‑validation failures.
7. **Batch multiple runs** – If you need to process many resumes, bundle them into a single request to Groq using a **single prompt** that returns an array of JSON objects. This reduces overhead headers and per‑request token charges.

## 4. Quick checklist for developers

- [ ] Verify that `.env` contains only the required `GROQ_API_KEY` and `GROQ_MODEL`.
- [ ] For local dev, set `LLM_FORCE_MOCK=true` to avoid accidental token consumption.
- [ ] Keep `capInputText` limits appropriate for your typical resume/JD length.
- [ ] Use the `skipGaps` flag or a custom feature flag when you only need a quick match score.
- [ ] Monitor Groq usage in the console (`console.log` statements in `llm.ts` will show the request URLs and token payloads when in debug mode).

---

*Last updated: 2026‑05‑19*

## Prompt Usage Details

| Prompt (file) | Pipeline stage | When it runs | Data sent to Groq |
|---|---|---|---|
| `src/prompts/resume-parser.ts` (`buildResumeParserMessages`) | `runAnalyzePipeline` → `timed(..., "analyze.resume", ...)` | During **Analyze** after the resume text is capped. | Raw resume text (capped) embedded in the prompt to produce a structured `ResumeProfile` JSON. |
| `src/prompts/jd-extraction.ts` (`buildJdExtractionMessages`) | `runAnalyzePipeline` → `timed(..., "analyze.jd", ...)` | During **Analyze** after the JD text is capped. | Raw job‑description text (capped) embedded to produce a structured `JobDescriptionProfile` JSON. |
| `src/prompts/match-scoring.ts` (`buildMatchScoringMessages`) | **Two uses**: <br>• `runAnalyzePipeline` → `timed(..., "analyze.match", ...)` (original scores) <br>• `runTailorPipeline` → `timed(..., "tailor.match", ...)` (tailored scores) | After the respective JSON objects are built (original or tailored). | Sends the **resume JSON** (original or tailored) and the **JD JSON**, plus a label (`"original resume"` or `"tailored resume"`). |
| `src/prompts/gap-analysis.ts` (`buildGapAnalysisMessages`) | **Two uses**: <br>• `runAnalyzePipeline` → `timed(..., "analyze.gaps", ...)` (original gaps) <br>• `runTailorPipeline` → `timed(..., "tailor.gaps", ...)` (tailored gaps) | After the resume/JD JSONs are ready. | Sends the **resume JSON** (original or tailored) and the **JD JSON** to generate a list of gaps with evidence, suggested actions, and priority. |
| `src/prompts/bullet-rewriter.ts` (`buildBulletRewriterMessages`) | `runTailorPipeline` → `timed(..., "tailor.rewrite", ...)` | During **Tailor** after the analysis phase. | Sends the **original resume JSON** and the **JD JSON** with detailed instructions for rewriting bullets, summary, and skills. |
| `src/prompts/json-repair.ts` (`buildJsonRepairMessages`) | Internally used by `completeJson` when a response fails schema validation (up to `MAX_RETRIES`). | Only when the LLM output cannot be parsed as JSON. | Sends the **invalid output snippet** and the **schema hint** to ask Groq to fix the JSON. |

These prompts together account for the token usage summarized earlier.

---

*Last updated: 2026‑05‑19*
