# 🧬 Resume Shapeshifter

An intelligent, high-performance, and end‑to‑end AI‑powered resume tailoring engine. It empowers candidates to upload their resumes (PDF/DOCX), parse and match them against target job descriptions in real-time, perform precise skills gap analyses, dynamically rewrite experience bullets to emphasize relevant competencies, and export clean, ATS-compliant resumes alongside comprehensive comparative audit reports.

Built with a highly optimized, dual-pass serverless AI pipeline, server-side Puppeteer PDF rendering, and enterprise-grade consistency guardrails.

---

## 🌟 Key Features

- **📂 Intelligent Multi-Format Ingestion:**
  - Accepts `.pdf` and `.docx` files up to **5MB**.
  - **Magic-Byte Verification:** Server-side inspection of headers (`%PDF` and `PK\x03\x04` ZIP signatures) to prevent renamed extension attacks or file spoofing.
  - **Clean Normalization:** Automatically filters smart typography, normalizes white spaces, and stabilizes text layouts for high-fidelity extraction.
- **🔒 Secure Authentication & Data Persistence:**
  - Robust user authentication powered by **JWT (JSON Web Tokens)** stored in HTTP-only cookies and **bcryptjs** password hashing.
  - Edge-compatible Next.js Middleware route protection ensuring uncompromising security.
  - Relational data persistence backed by **MySQL** and managed elegantly through **Drizzle ORM**.
- **🧠 Atomic 2-Pass LLM Pipeline (Groq-Optimized):**
  - Consolidates a legacy 7-call sequential LLM flow into a highly concurrent **2-call atomic flow**.
  - Leverages `llama-3.1-8b-instant` (or other Groq models) using raw native `fetch` over HTTP with zero external heavy package bloat.
  - Guarantees structured data integrity via strict **Zod Schema Validation** and an intelligent **JSON Repair Prompting Engine** to capture and resolve parsing errors automatically.
- **⚡ 77% Token Footprint Reduction:**
  - Structural consolidation eliminates duplicate text transfers, collapsing token payloads from **~4,400 to ~1,000 tokens** per run.
  - Programmatic under-the-hood truncation caps inputs to **3,500 characters** in `text-limits.ts` to preserve context budget without degrading UX.
- **📊 Double Server-Side PDF Rendering:**
  - Renders PDFs on the server using headless `puppeteer-core`, binding directly to the host's existing Chrome/Edge installation to bypass massive browser binary bloats.
  - **ATS-Tailored Resume:** Single-column, highly-parseable serif CV styled specifically to pass automated applicant tracking systems.
  - **Insights & Comparison PDF:** Premium dual-column comparative audit highlighting Match Score gains, JD requirements, gap priorities, and side-by-side bullet comparisons complete with AI confidence scores.
  - **Idempotency-Key Caching:** Fast memory caching of generated PDF buffers to block redundant Chrome instance launches on repeated downloads.
- **🛡️ Verification Gates & Anti-Hallucination Guardrails:**
  - **Fuzzy Consistency Audits:** Advanced post-LLM validation comparing tailored outputs against original profiles to detect and intercept fabricated job details or model hallucinations.
  - **Review Gate:** A frontend UX barrier locking downloads until the candidate actively reviews lower-confidence rewrites.
  - **IP-Based Rate Limiting:** Built-in in-memory throttle limiting clients to 10 requests per minute with native `429 Too Many Requests` responses and detailed `Retry-After` headers.
- **🎯 One-Click "Keyless" Demo Sandbox:**
  - Complete sandbox mock system. If no `GROQ_API_KEY` is present, the app gracefully falls back to structured local mock fixtures.
  - One-click **"Load sample data"** buttons instantly populate realistic engineering profiles to test out the visual side-by-side interface in seconds.

---

## 📂 Project Architecture

The codebase is organized with strict separation between API routes, core pipeline engines, validation schemas, and reusable visual UI components:

```text
├── src/
│   ├── app/
│   │   ├── api/                   # Serverless Endpoint Handlers
│   │   │   ├── analyze/           # Trigger combined resume & JD parsing/matching
│   │   │   ├── export/            # Puppeteer ATS & Comparison PDF streamer
│   │   │   ├── ingest/            # Safe magic-byte PDF/DOCX extractor
│   │   │   ├── runs/              # In-memory session telemetry endpoints
│   │   │   ├── tailor/            # Trigger consolidated bullet-rewriting
│   │   │   └── validate/          # Core schema check triggers
│   │   ├── globals.css            # Tailored styles & glassmorphism variables
│   │   ├── layout.tsx             # Shared root HTML viewport & font mappings
│   │   ├── page.tsx               # High-impact product landing page
│   │   └── tool/                  # Core engine app workspace routing
│   │       └── page.tsx           # Assembles ToolFlow orchestrator
│   ├── components/                # Modular client UX components
│   │   ├── GapAnalysis.tsx        # Priority badges & recommendation lists
│   │   ├── JDInput.tsx            # Rich job description textarea
│   │   ├── PDFExportButton.tsx    # Idempotence-safe Puppeteer download buttons
│   │   ├── ResumeInput.tsx        # Editable resume raw text viewer
│   │   ├── ResumeUpload.tsx       # Drag-and-drop ingestion panel with validation
│   │   ├── ScoreCard.tsx          # Heuristic radial dial & difference scores
│   │   ├── SideBySideDiff.tsx     # Custom color-coded before/after bullet diffs
│   │   └── ToolFlow.tsx           # Central workspace orchestrator state machine
│   ├── lib/                       # Under-the-Hood Logical Modules
│   │   ├── pipeline/              # LLM Pipeline Executors
│   │   │   ├── analyze.ts         # Parsers, scorings & initial gap orchestrator
│   │   │   ├── errors.ts          # Resilient Groq HTTP error mappings
│   │   │   └── tailor.ts          # Bullet rewrites & post-scoring orchestrator
│   │   ├── consistency.ts         # Post-LLM fuzzy consistency validation engine
│   │   ├── ingest.ts              # File sniffers & text normalizer
│   │   ├── json-extract.ts        # String Zod-coercers & Zod-safe decoders
│   │   ├── llm-config.ts          # Local/global environment token managers
│   │   ├── llm-preprocess.ts      # LLM response normalizers
│   │   ├── llm.ts                 # HTTP Groq requester, retriers & json repair
│   │   ├── pdf.ts                 # Headless Puppeteer browser PDF templates
│   │   ├── pipeline-logger.ts     # Diagnostic runtime console telemetrist
│   │   ├── rate-limit.ts          # IP-based sliding token rate throttle
│   │   ├── resume-assembly.ts     # Integrates new bullet changes safely into profiles
│   │   ├── run-store.ts           # In-memory state database
│   │   └── sample-data.ts         # Golden one-click demo dataset
│   ├── schemas/                   # Shared Canonical Zod Data Schemes
│   │   └── index.ts               # Core types for Profiles, Gaps, Matches & Audits
│   └── types/                     # TypeScript structural interfaces
├── tests/                         # Full Vitest Integration & Unit Suite
│   ├── guardrails.test.ts         # IP-throttle & fabrication verification tests
│   ├── ingest.test.ts             # Magic-bytes & normalization validator tests
│   ├── json-extract.test.ts       # LLM JSON repair resilience tests
│   └── resume-assembly.test.ts    # Bullet-swapping integration tests
├── .env.example                   # Client-side configuration template
├── apitoken.md                    # Detailed optimization statistics ledger
├── progress.md                    # Core implementation phase checklist
├── tsconfig.json                  # Strict type-checking rules
└── tailwind.config.ts             # Sleek dark mode visual designs
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Suryxbg/Resume_Shapeshifter.git
cd Resume_Shapeshifter
```

### 2. Install Dependencies

If you have a global Node.js environment configured on your system:

```bash
npm install
```

If `npm` is not globally recognized (common on legacy Windows environment configurations), execute our standalone installer which automatically resolves local paths:

```powershell
.\scripts\install-deps.ps1
```

### 3. Configure the Server-Side Environment

Create a local config file (this is strictly excluded from version control to **keep your API keys hidden and safe**):

```bash
cp .env.example .env.local
```

Open `.env.local` and add your Groq key:

```ini
GROQ_API_KEY=gsk_your_actual_key_here
GROQ_MODEL=llama-3.1-8b-instant
DATABASE_URL="mysql://root:root@localhost:3306/resume_shapeshifter"
JWT_SECRET="your-super-secret-jwt-key"
```

> [!IMPORTANT]
> **API Key Safety:** The `GROQ_API_KEY` is exclusively consumed inside Next.js serverless functions (`src/lib/llm.ts`). It is **never** sent to the client browser, preserving complete security of your credentials.
>
> **No Key? No Problem!** If `GROQ_API_KEY` is left blank, the system automatically falls back to **Mock mode**, showing an amber inference notice on the tool but allowing you to execute every single stage of the flow using built-in golden mock fixtures.

### 4. Fire Up the Development Server

```bash
npm run dev
```

Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 🎯 Experiencing the One-Click Demo

To quickly inspect the high-fidelity features without typing manual resumes:

1. Navigate to the tool workspace: [http://localhost:3000/tool](http://localhost:3000/tool).
2. Click **"Load sample data"** to instantly inject a pre-formatted, highly detailed Software Engineer resume and matching job description.
3. Select **"Analyze"** to execute Phase 1: watch the parsing animations, view the heuristic Match Score (e.g., 68%), and read the prioritized Skills Gaps.
4. Click **"Generate tailored resume"**: this rewrites experience bullets in real-time, recalculates a fresh tailored score (e.g., 91%), and provides audit reports.
5. Review the **Mandatory Verification Gate**: examine the color-coded side-by-side bullet diffs, read the AI rewrite justifications, check the verification box, and download your **ATS-friendly PDF** and **Visual Audit report**!

---

## ⚡ Performance & Token Optimization

By structurally shifting from consecutive, isolated prompts to consolidated combined payloads, we reduced network round-trip overhead and eliminated redundant text parsing.

### 📊 Before vs. After Consolidation Ledger

| Pipeline Stage       | Legacy Workflow (7 separate calls)                                               | Token Cost        | Consolidated Workflow (2 atomic calls)                      | Token Cost        | Performance Gain                                                                   |
| :------------------- | :------------------------------------------------------------------------------- | :---------------- | :---------------------------------------------------------- | :---------------- | :--------------------------------------------------------------------------------- |
| **Stage 1: Analyze** | 1. Resume parsing<br>2. JD extraction<br>3. Original scoring<br>4. Original gaps | ~2,400 tokens     | 1. Combined Analyze Prompt (`buildCombinedAnalyzeMessages`) | **~600 tokens**   | **~75.0% Reduction**<br>Sends raw text once; caps input strings at 3,500 chars.    |
| **Stage 2: Tailor**  | 5. Bullet rewriting<br>6. Tailored scoring<br>7. Tailored gaps                   | ~2,000 tokens     | 2. Combined Tailor Prompt (`buildCombinedTailorMessages`)   | **~400 tokens**   | **~80.0% Reduction**<br>Assembles summary, rewrites bullets, & scores in one pass. |
| **Total Pipeline**   | **7 sequential calls**                                                           | **~4,400 tokens** | **2 combined calls**                                        | **~1,000 tokens** | **~77.3% Overall Token Savings!**                                                  |

---

## 🧪 Testing

The engine is protected by a comprehensive suite of Vitest contract and unit tests validating parsing robustness, rate limits, PDF generation, and fuzzy audits.

To run all unit tests:

```bash
npm run test
```

To run tests without the interactive watch loop (perfect for CI/CD checks):

```bash
npm run test -- --watch=false
```

---

## ☁️ Deploying to Vercel

`Resume Shapeshifter` is fully optimized for **Vercel** serverless deployment with zero configuration required.

### 🛠️ Step-by-Step Vercel Deployment

1. **Import the Repository:**
   - Go to your [Vercel Dashboard](https://vercel.com/) and click **"Add New"** > **"Project"**.
   - Connect your GitHub account and import your repository: `Suryxbg/Resume_Shapeshifter`.

2. **Configure Build Settings:**
   - Vercel will automatically detect **Next.js** as the framework.
   - Leave the **Build Command** (`npm run build`), **Output Directory** (default), and **Install Command** (default) as they are.

3. **Configure Environment Variables:**
   - Expand the **"Environment Variables"** dropdown and add the following key-value pairs (see details below).

4. **Deploy:**
   - Click **"Deploy"**. Vercel will build and host your application in under a minute!

---

### ⚙️ Vercel Environment Variables Checklist

Here is the exhaustive checklist of environment variables you can configure in the Vercel console:

| Variable Name        | Required?        | Default Value             | Description / Purpose                                                                                                                                             |
| :------------------- | :--------------- | :------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`GROQ_API_KEY`**   | **Yes (for AI)** | _None_                    | Your live API key from the [Groq Console](https://console.groq.com/). If omitted, the app gracefully falls back to **Mock Demo mode** using safe sample fixtures. |
| **`GROQ_MODEL`**     | No               | `llama-3.3-70b-versatile` | The LLM model used for resume analysis and atomic bullet rewriting. We recommend `llama-3.3-70b-versatile` or `llama-3.1-8b-instant`.                             |
| **`PDF_FORCE_MOCK`** | No               | `false`                   | Force standard high-fidelity ATS mock PDF buffers (useful for stable, serverless runs).                                                                           |
| **`LLM_FORCE_MOCK`** | No               | `false`                   | Forces local mock LLM responses even if `GROQ_API_KEY` is active (useful for demo/debugging).                                                                     |
| **`DATABASE_URL`**   | **Yes (for DB)** | _None_                    | MySQL database connection string. Required for user accounts and data persistence.                                                                                |
| **`JWT_SECRET`**     | **Yes (for Auth)**| _None_                    | Secret key for signing and verifying JSON Web Tokens.                                                                                                             |

---

### 💡 Serverless Deployment Architecture Notes

- **Graceful Headless Browser Fallback:** Since standard serverless platforms like Vercel do not include local Chrome/Edge installations (which Puppeteer requires), the application is designed to **automatically detect** the missing browser path and **gracefully fall back** to generating a lightweight, standard ATS-compliant mock PDF buffer. This keeps the application 100% stable, lightning-fast, and cost-free without needing expensive browserless.io endpoints or heavy browser binaries.
- **Serverless Rate Limiting:** The built-in rate-limiter utilizes an in-memory sliding window. In Vercel's serverless environment, each container instance scales and tracks rate limits independently, which is ideal for portfolio applications.

---

## 📜 Architectural Insights

- For deep technical breakdowns, rate limits, schema details, and fuzzy validation mathematical models, check out [`architecture.md`](architecture.md).
- For exact token footprint logs, prompt strategies, and check-lists, see [`apitoken.md`](apitoken.md).
- For edge cases, boundary parameters, and ingestion constraints, check out [`edge-case.md`](edge-case.md).

---

_Developed with 🧬 for elite candidate resume optimization workflows._
