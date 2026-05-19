# Resume Shapeshifter

**Live demo:** https://github.com/Suryxbg/Resume_Shapeshifter (GitHub repository)

## Overview

Resume Shapeshifter is an end‑to‑end AI‑powered resume tailoring engine. It lets users upload a resume, provide a job description, and receive:

* A **heuristic match score** between the original resume and the JD.
* **Gap analysis** that flags missing skills or experience.
* **Bullet rewriting** that transforms the original experience into language that aligns with the target role (including domain‑pivot scenarios).
* A side‑by‑side **PDF comparison** of the original and tailored resumes.

All heavy LLM work runs on the server using **Groq** (LLaMA models). The API key lives only in a server‑side `.env` file and is excluded from version control.

## Features

- **PDF Export:** High-fidelity, server-rendered ATS-friendly PDF and a comprehensive side-by-side visual audit report.
- **One-Click Demo:** Built-in mock mode and sample data allows testing the complete UI without an API key.

## Prerequisites

- Node.js **20+** with **npm** (install from [https://nodejs.org/](https://nodejs.org/) if `npm` is missing in your terminal).
- **No secrets in git.** Copy `.env.example` to `.env.local` and set `GROQ_API_KEY` when ready (leave blank to use mock mode).

## Setup

If `npm` is not recognized (common in some IDE terminals on Windows):

```powershell
.\scripts\install-deps.ps1
```

Otherwise:

```bash
npm install
npm run build
npm run start
```

### Running the Demo

1. Start the server (\`npm run dev\` or \`npm run start\`).
2. Navigate to [http://localhost:3000/tool](http://localhost:3000/tool).
3. Click **"Load sample data"** to instantly populate a realistic Software Engineer resume and Job Description.
4. Click **"Analyze"** to see the parsed job requirements, original match score, and gap analysis.
5. Click **"Generate tailored resume"** to rewrite the resume bullets and see the side-by-side comparison.
6. Acknowledge the accuracy verification gate, then download the ATS-friendly PDF and the side-by-side comparison report.

### Groq Configuration

```bash
cp .env.example .env.local
# GROQ_API_KEY=   ← add your key when you have it
# GROQ_MODEL=llama-3.3-70b-versatile
```

Without a key, `/api/analyze` and `/api/tailor` use **mock fixtures** and return `inferenceMode: "mock"` plus an `inferenceNotice` banner in the UI.

## Scripts

| Script        | Description                |
| ------------- | -------------------------- |
| `npm run dev` | Next.js dev server         |
| `npm run build` | Production build         |
| `npm run start` | Run production build     |
| `npm run lint`  | ESLint (Next core rules) |
| `npm run test`  | Vitest contract tests    |
| `npm run format` | Prettier (optional)     |

## Progress

Update **`progress.md`** after each implementation phase (see `implementation-plan.md`).
