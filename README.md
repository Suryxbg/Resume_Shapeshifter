# Resume Shapeshifter

An AI-powered resume tailoring engine that helps job seekers align their resume with a target job description — truthfully. Upload or paste a resume, analyze match scores and skill gaps, generate tailored bullet rewrites, and export ATS-friendly PDFs with side-by-side comparison reports.

Built with **Next.js 15**, **Groq LLM**, **MySQL + Drizzle ORM**, **JWT authentication**, server-side PDF rendering, and enterprise-style guardrails.

**Live repo:** [github.com/Suryxbg/Resume_Shapeshifter](https://github.com/Suryxbg/Resume_Shapeshifter)

---

## Key Features

### Guest Mode (no login required)

Use the full tailoring workflow without creating an account:

- Upload resumes (PDF / DOCX) or paste text
- Paste job descriptions and run analysis
- Generate tailored resumes with side-by-side diff review
- Download tailored and comparison PDFs

Authentication is only required when you want to **save resumes permanently** and access them later.

### Save to Account + Resume History

- **Guest users** see a prominent call-to-action on the results page: *"Save your tailored resumes and access them anytime."*
- Clicking **Sign Up** or **Login** preserves generated content in `sessionStorage` during auth — nothing is lost
- After successful authentication, the resume is **auto-saved** and the user returns to the results page with a success message
- **Authenticated users** can manually save resumes, browse **My Resumes**, view past tailoring sessions, and re-download PDFs

### Intelligent Document Ingestion

- Accepts `.pdf` and `.docx` files up to **5MB**
- **Magic-byte verification** (`%PDF`, `PK\x03\x04`) prevents renamed-extension attacks
- Normalizes smart quotes, dashes, and whitespace for stable LLM parsing
- Extracted text is shown in an editable textarea before analysis

### 2-Pass Atomic LLM Pipeline (Groq)

- Consolidated from a legacy 7-call flow into **2 atomic Groq calls** (analyze + tailor)
- Native `fetch` to Groq API — no heavy OpenAI SDK dependency
- Strict **Zod schema validation** with JSON repair retries on malformed LLM output
- **~77% token reduction** (~4,400 → ~1,000 tokens per full run)
- Input capped at **3,500 characters** per field to preserve context budget
- **Mock fallback** when `GROQ_API_KEY` is unset — full UI demo without an API key

### Server-Side PDF Export

- **ATS-Tailored Resume PDF** — single-column, serif typography optimized for parsing
- **Insights & Comparison PDF** — dual-column audit with score gains, JD summary, bullet diffs, gap analysis, disclaimer
- Renders via `puppeteer-core` using the host's Chrome/Edge when available
- **Serverless fallback** on Vercel (no Chromium) — programmatic plain-text PDF 1.4 generator
- **Idempotency-Key caching** prevents duplicate heavy PDF renders on double-click

### Security, Auth & Persistence

- **JWT** stored in HTTP-only cookies (`jose` library)
- **bcryptjs** password hashing
- **Next.js Edge Middleware** protects `/resumes` and `/profile`
- **MySQL** relational storage via **Drizzle ORM**
- `resume_history` table linked to users (1:many)

### Guardrails & Rate Limiting

- Post-LLM **fuzzy consistency audits** detect fabricated employers or hallucinated bullets
- **Mandatory review gate** locks PDF downloads until the user confirms accuracy
- **IP-based rate limiting** — 10 requests/minute on analyze, tailor, and export endpoints

### One-Click Demo

- **"Load sample data"** injects a realistic software engineer resume + job description
- Works without a Groq API key using golden mock fixtures

---

## User Flows

### Guest flow

```
Landing → Open Tool → Upload/Paste → Analyze → Tailor → Review → Export PDFs
                                                              ↓
                                    "Sign in to save" banner (Sign Up / Login)
```

### Save-after-auth flow

```
Guest generates resume → Clicks Sign Up or Login
  → Resume data stored in sessionStorage
  → Auth completes → Redirected back to /tool
  → Resume auto-saved to account → Success message shown
```

### Authenticated flow

```
Login → Tool (or My Resumes) → Save resume → View history → Re-download PDFs
```

---

## Project Architecture

### High-level system diagram

```mermaid
flowchart LR
  subgraph client [Browser]
    UI[Landing / Tool / My Resumes]
  end

  subgraph nextjs [Next.js App]
    API[API Routes]
    MW[Edge Middleware]
    Pipe[LLM Pipeline]
    PDF[PDF Engine]
  end

  subgraph external [External]
    Groq[Groq API]
    MySQL[(MySQL)]
  end

  UI --> API
  MW --> UI
  API --> Pipe
  API --> PDF
  Pipe --> Groq
  API --> MySQL
```

### Pipeline stages

```mermaid
flowchart TD
  A[Upload or paste resume + JD] --> B[POST /api/analyze]
  B --> C[Combined parse + score + gaps]
  C --> D[POST /api/tailor]
  D --> E[Combined rewrite + rescore + gaps]
  E --> F[Side-by-side review]
  F --> G[POST /api/export/pdf]
  G --> H[Tailored PDF + Comparison PDF]
  F --> I{Authenticated?}
  I -->|Yes| J[POST /api/resumes]
  I -->|No| K[Sign Up / Login → auto-save]
  J --> L[My Resumes history]
```

### Directory structure

```text
resume_shapeshifter/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Login & signup pages
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── api/                      # Server API routes
│   │   │   ├── analyze/              # Combined JD + resume parse, score, gaps
│   │   │   ├── tailor/               # Bullet rewrite + rescore
│   │   │   ├── export/pdf/           # PDF generation (tailored | comparison)
│   │   │   ├── ingest/               # PDF/DOCX text extraction
│   │   │   ├── resumes/              # Save & list resume history (auth)
│   │   │   ├── runs/                 # In-memory tailoring run store
│   │   │   ├── validate/             # Zod schema validation endpoint
│   │   │   └── auth/                 # login, signup, logout, me
│   │   ├── tool/                     # Main tailoring workspace
│   │   ├── resumes/                  # My Resumes list + detail pages
│   │   ├── profile/                  # User profile page
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Landing page
│   ├── components/
│   │   ├── auth/                     # LoginForm, SignupForm, AuthButtons
│   │   ├── layout/                   # SiteHeader
│   │   ├── tool/                     # ToolFlow, inputs, ScoreCard, PDF export, SaveResumeBanner
│   │   └── resumes/                  # SavedResumeDetail
│   ├── lib/
│   │   ├── api/                      # Request/response Zod types, error helpers
│   │   ├── auth/                     # Session helpers, JWT, bcrypt hashing
│   │   ├── data/                     # Sample data + mock fixtures
│   │   ├── db/                       # Drizzle client + MySQL schema
│   │   ├── ingest/                   # File extraction + text limits
│   │   ├── llm/                      # Groq client, config, JSON extract/repair
│   │   ├── pdf/                      # HTML templates + PDF engine
│   │   ├── pipeline/                 # analyze.ts, tailor.ts orchestrators
│   │   ├── resume/                   # Assembly, consistency, pending-save (sessionStorage)
│   │   ├── stores/                   # In-memory TailoringRun store
│   │   └── utils/                    # Rate limiting, pipeline logging
│   ├── prompts/                      # Groq prompt builders (analyze, tailor, repair)
│   ├── schemas/                      # Canonical Zod schemas (ResumeProfile, MatchScore, etc.)
│   ├── types/                        # TypeScript declarations
│   └── middleware.ts                 # JWT route protection
├── tests/                            # Vitest unit + contract tests (34 tests)
├── drizzle/                          # SQL migrations (users, resume_history)
├── docs/                             # Architecture, implementation plan, progress, edge cases
├── scripts/                          # install-deps.ps1, utilities
├── docker-compose.yml                # App + MySQL containers
├── Dockerfile                        # Production container with Chromium
├── .env.example
└── README.md
```

### Database schema

**`users`**

| Column         | Type         | Notes                |
| -------------- | ------------ | -------------------- |
| id             | varchar(36)  | UUID primary key     |
| name           | varchar(255) | Display name         |
| email          | varchar(255) | Unique               |
| password_hash  | varchar(255) | bcrypt               |
| created_at     | timestamp    |                      |
| updated_at     | timestamp    |                      |

**`resume_history`** (users 1 → many)

| Column                  | Type         | Notes                              |
| ----------------------- | ------------ | ---------------------------------- |
| id                      | varchar(36)  | UUID primary key                   |
| user_id                 | varchar(36)  | FK → users.id                      |
| job_title               | varchar(255) | From parsed JD                     |
| company_name            | varchar(255) | Optional                           |
| original_resume_text    | text         | Raw resume input                   |
| job_description_text    | text         | Raw JD input                       |
| generated_resume_text   | text         | Assembled tailored plain text      |
| ats_score               | int          | Tailored match score (0–100)       |
| tailoring_run_id        | varchar(36)  | Links to in-memory run for PDF     |
| run_data                | text         | JSON blob for full pipeline replay |
| created_at / updated_at | timestamp    |                                    |

### API endpoints

| Method | Endpoint              | Auth     | Description                                      |
| ------ | --------------------- | -------- | ------------------------------------------------ |
| POST   | `/api/analyze`        | No       | Parse resume + JD, score, gap analysis           |
| POST   | `/api/tailor`         | No       | Rewrite bullets, rescore, refresh gaps           |
| POST   | `/api/export/pdf`     | No       | Download tailored or comparison PDF              |
| POST   | `/api/ingest`         | No       | Extract text from PDF/DOCX upload                |
| POST   | `/api/resumes`        | Yes      | Save a tailored resume to account                |
| GET    | `/api/resumes`        | Yes      | List user's saved resumes                        |
| GET    | `/api/resumes/[id]`   | Yes      | Get saved resume detail (user-scoped)            |
| POST   | `/api/auth/signup`    | No       | Create account + set JWT cookie                  |
| POST   | `/api/auth/login`     | No       | Authenticate + set JWT cookie                    |
| POST   | `/api/auth/logout`    | No       | Clear JWT cookie                                 |
| GET    | `/api/auth/me`        | Yes      | Current user profile                             |
| POST   | `/api/validate`       | No       | Validate JSON against Zod schemas                |
| POST   | `/api/runs`           | No       | Create in-memory tailoring run                   |
| GET    | `/api/runs/[id]`      | No       | Fetch tailoring run by ID                        |

### Pages & navigation

| Route            | Access        | Purpose                              |
| ---------------- | ------------- | ------------------------------------ |
| `/`              | Public        | Landing page                         |
| `/tool`          | Public        | Full tailoring workflow              |
| `/login`         | Public        | Sign in (`?returnTo=` supported)     |
| `/signup`        | Public        | Create account                       |
| `/resumes`       | Authenticated | Saved resume history list            |
| `/resumes/[id]`  | Authenticated | Saved resume detail + PDF re-export  |
| `/profile`       | Authenticated | Account info                         |

**Navigation when authenticated:** My Resumes · Profile · Logout  
**Navigation when guest:** Login · Sign Up

---

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8 (local or Docker)
- Optional: Groq API key for live LLM inference
- Optional: Chrome or Edge installed locally for high-fidelity PDF rendering

### 1. Clone the repository

```bash
git clone https://github.com/Suryxbg/Resume_Shapeshifter.git
cd Resume_Shapeshifter
```

### 2. Install dependencies

```bash
npm install
```

On Windows if `npm` is not on PATH:

```powershell
.\scripts\install-deps.ps1
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

```ini
GROQ_API_KEY=gsk_your_actual_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL="mysql://root:root@localhost:3306/resume_shapeshifter"
JWT_SECRET="your-super-secret-jwt-key"
```

> **API key safety:** `GROQ_API_KEY` is only used in server-side code (`src/lib/llm/`). It is never exposed to the browser.
>
> **No key?** Leave `GROQ_API_KEY` blank — the app runs in **mock mode** with golden fixtures and an amber notice in the UI.

### 4. Set up the database

Start MySQL (or use Docker Compose — see below), then apply migrations:

```bash
mysql -u root -p resume_shapeshifter < drizzle/0000_sweet_doctor_strange.sql
mysql -u root -p resume_shapeshifter < drizzle/0001_resume_history.sql
```

### 5. Run the development server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

---

## Docker Deployment

The fastest way to run app + MySQL together:

```bash
cp .env.example .env
# Edit .env with GROQ_API_KEY, JWT_SECRET, DATABASE_URL

docker compose up -d --build
```

Then apply migrations inside the DB container:

```bash
docker compose exec db mysql -uroot -proot resume_shapeshifter < drizzle/0000_sweet_doctor_strange.sql
docker compose exec db mysql -uroot -proot resume_shapeshifter < drizzle/0001_resume_history.sql
```

App available at **[http://localhost:3000](http://localhost:3000)**.

See [`docs/docker_prep.md`](docs/docker_prep.md) for full Docker CLI instructions.

---

## One-Click Demo

1. Go to [http://localhost:3000/tool](http://localhost:3000/tool)
2. Click **Load sample data**
3. Click **Analyze** — view match score and gap analysis
4. Click **Generate tailored resume** — see side-by-side bullet diffs
5. Check the **Mandatory Verification Gate**
6. Download **ATS-Tailored Resume PDF** and **Comparison PDF**
7. (Optional) Click **Sign Up** on the save banner to persist the resume to your account

---

## Performance & Token Optimization

| Stage    | Legacy (7 calls) | Consolidated (2 calls) | Token savings |
| -------- | ---------------- | ---------------------- | ------------- |
| Analyze  | ~2,400 tokens    | ~600 tokens            | ~75%          |
| Tailor   | ~2,000 tokens    | ~400 tokens            | ~80%          |
| **Total**| **~4,400**       | **~1,000**             | **~77%**      |

---

## Testing

```bash
npm run test          # Run all 34 Vitest tests
npm run build         # Production build + type check
npm run lint          # ESLint
```

Test coverage includes: schema contracts, JSON extract/repair, ingest magic-bytes, resume assembly, guardrails, rate limiting, PDF export, and resume text assembly.

---

## Deploying to Vercel

1. Import [Suryxbg/Resume_Shapeshifter](https://github.com/Suryxbg/Resume_Shapeshifter) in the Vercel dashboard
2. Framework preset: **Next.js** (auto-detected)
3. Add environment variables:

| Variable       | Required       | Description                                              |
| -------------- | -------------- | -------------------------------------------------------- |
| `GROQ_API_KEY` | For live AI    | Groq API key; omit for mock demo mode                      |
| `GROQ_MODEL`   | No             | Default: `llama-3.3-70b-versatile`                       |
| `DATABASE_URL` | For auth/save  | MySQL connection string (use PlanetScale, Railway, etc.) |
| `JWT_SECRET`   | For auth       | Secret for signing JWT cookies                           |
| `LLM_FORCE_MOCK` | No           | Force mock LLM even with a key set                       |

**Serverless notes:**

- PDF export falls back to plain-text PDF when no Chromium is available (standard on Vercel)
- Rate limiting uses per-instance in-memory buckets (suitable for portfolio scale)
- Use an external MySQL provider for `DATABASE_URL` — Vercel does not include MySQL

---

## Documentation

| Document | Description |
| -------- | ----------- |
| [`docs/architecture.md`](docs/architecture.md) | System design, data contracts, PDF pipeline, risks |
| [`docs/context.md`](docs/context.md) | Product requirements and acceptance criteria |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Phase-wise build plan |
| [`docs/progress.md`](docs/progress.md) | Implementation completion log |
| [`docs/edge-case.md`](docs/edge-case.md) | Edge cases and mitigations by phase |
| [`docs/docker_prep.md`](docs/docker_prep.md) | Docker deployment guide |
| [`docs/apitoken.md`](docs/apitoken.md) | Token optimization ledger |

---

## Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Framework    | Next.js 15 (App Router), React 19, TypeScript   |
| Styling      | Tailwind CSS                                    |
| LLM          | Groq API (OpenAI-compatible), native fetch      |
| Validation   | Zod                                             |
| Database     | MySQL 8, Drizzle ORM                            |
| Auth         | JWT (jose), bcryptjs, HTTP-only cookies         |
| PDF          | puppeteer-core + plain-text fallback            |
| Ingestion    | pdf-parse, mammoth                              |
| Testing      | Vitest                                          |
| Containers   | Docker, Docker Compose                          |

---

## Implementation Status

All MVP phases (0–6) are complete:

- Foundation, schemas, and mock pipeline
- Full UI vertical slice
- Groq LLM integration with mock fallback
- PDF/DOCX ingestion with magic-byte checks
- Server-side PDF export (Chrome + serverless fallback)
- Guardrails, consistency audits, review gate, rate limiting
- Demo polish, sample data, documentation
- **Guest mode + save-to-account workflow**
- **Resume history persistence**
- **Codebase reorganized into domain folders**

---

_Developed for truthful, evidence-based resume optimization — always review AI output before applying._
