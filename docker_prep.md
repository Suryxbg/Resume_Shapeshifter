# 🐳 Docker Deployment Guide: Resume Shapeshifter

This guide provides a comprehensive, step-by-step process to containerize, build, and deploy the **Resume Shapeshifter** application using **Docker** and **Docker Compose**.

The configuration has been fully optimized to leverage Next.js 15 standalone output, include containerized Chromium for local PDF tailoring, and run under a secure, non-root user footprint.

---

## 🚀 Quick Start (Docker Compose)

The easiest way to get the application up and running is using **Docker Compose**.

### Step 1: Prepare Environment Variables

Ensure you have a `.env` file in the root of the project with your Groq API credentials. If you don't have one, copy `.env.example`:

```bash
cp .env.example .env
```

Fill in your `GROQ_API_KEY` (if empty, the app will gracefully fall back to mock data), and add database details:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL="mysql://root:root@db:3306/resume_shapeshifter"
JWT_SECRET="your-super-secret-jwt-key"
```

### Step 2: Spin Up the Container

Run the following command in your terminal:

```bash
docker compose up -d --build
```

- The `-d` flag runs the container in detached (background) mode.
- The `--build` flag ensures that the image is built or updated with any recent code changes.

### Step 3: Access the Application

Open your web browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Step-by-Step Manual Deployment (Docker CLI)

If you prefer to manage the build and runtime manually using the standard Docker CLI, follow these steps:

### 1. Build the Docker Image

Build the image and tag it as `resume-shapeshifter:latest`:

```bash
docker build -t resume-shapeshifter:latest .
```

### 2. Run the Container

Run the container, mapping port `3000` of the host to port `3000` of the container, and injecting your `.env` file:

```bash
docker run -d \
  -p 3000:3000 \
  --name resume-shapeshifter-app \
  --env-file .env \
  resume-shapeshifter:latest
```

### 3. Manage the Container Lifecycle

- **Stop the container:** `docker stop resume-shapeshifter-app`
- **Start the container:** `docker start resume-shapeshifter-app`
- **View application logs:** `docker logs -f resume-shapeshifter-app`
- **Remove the container:** `docker rm -f resume-shapeshifter-app`

---

## ⚙️ Configuration & Architecture Updates

To ensure smooth and high-performance operation inside a containerized environment, several critical architectural changes were introduced to the codebase:

### 1. Next.js 15 Standalone Output (`next.config.ts`)

Next.js was configured to build in `standalone` mode. This traces all server dependencies and bundles a minimal subset of `node_modules` into `.next/standalone`, dropping the final production image size from **~1.2GB** to **~380MB** (including Chromium).

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
};
```

### 2. Dynamic Chromium Engine Path (`src/lib/pdf.ts`)

The PDF generation engine is environment-aware and features a graceful fallback pipeline:

- Checks `process.env.PUPPETEER_EXECUTABLE_PATH` first.
- Automatically resolves to containerized Chromium `/usr/bin/chromium-browser` or `/usr/bin/google-chrome` under Linux.
- Falls back seamlessly to system Chrome/Edge paths on Windows for local development.
- **Serverless / Vercel Fallback:** When running on browser-less cloud environments like Vercel, the engine detects that no system browser is found and falls back programmatically to compile a plain text PDF structure (`generateValidMockPdf`) containing structured text data (avoiding deployment package crashes or execution timeouts).
- **Docker Integration:** The Docker image pre-installs Chromium and its system dependencies inside Alpine Linux, ensuring it always generates high-fidelity visual PDF outputs.

### 3. Container Optimization & Security (`Dockerfile`)

- **Multi-Stage Build**: Keeps development dependencies out of the final production runner.
- **Minimal Base Image**: Uses `node:20-alpine` to maintain a tight security profile.
- **Non-Root Execution**: Runs under the custom `nextjs` system user, adhering to the principle of least privilege.
- **Asset Copying**: Manually overlays `.next/static` and `/public` assets, as Next.js standalone server offloads static file delivery to container hosts or CDNs.

---

## 📝 Environment Reference Table

The following environment variables can be configured inside `.env` or injected directly into the container:

| Variable Name               | Default Value               | Description                                                                      |
| :-------------------------- | :-------------------------- | :------------------------------------------------------------------------------- |
| `PORT`                      | `3000`                      | Port on which the Next.js server runs.                                           |
| `GROQ_API_KEY`              | _(None)_                    | Server-side API key for LLM tailoring (falls back to fixtures if missing).       |
| `GROQ_MODEL`                | `llama-3.3-70b-versatile`   | LLM model used for tailoring resumes.                                            |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium-browser` | Executable path of the Chromium browser inside the container.                    |
| `PDF_FORCE_MOCK`            | `false`                     | Set to `true` to skip puppeteer rendering and output immediate Mock PDF buffers. |
| `DATABASE_URL`              | _(None)_                    | MySQL connection string for user data and authentication.                        |
| `JWT_SECRET`                | _(None)_                    | Secret key used to sign and verify JSON Web Tokens.                              |

---

## 🩺 Troubleshooting inside Docker

> [!TIP]
> **Performance Optimization**
> When running on Docker Desktop (especially on Windows/macOS), ensure you allocate at least **2GB of RAM** to your Docker Engine. Puppeteer's headless Chromium instance is memory-intensive during PDF generation operations.

### Puppeteer fails with `Revision not found` or library errors

- **Cause:** The Docker container cannot locate the internal Chromium binary or is missing essential Linux system libraries.
- **Solution:** The `Dockerfile` has been explicitly configured to install Alpine system dependencies (`nss`, `freetype`, `harfbuzz`, etc.) and sets `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` to skip downloading redundant Chromium binaries. Ensure your `Dockerfile` remains unmodified in Stage 3.

### Standalone Build Errors & Tracing Warnings

- **Symptom:** During compilation, Next.js outputs a warning similar to:
  `⚠ Failed to copy traced files for ... [Error: ENOENT: no such file or directory, mkdir '...standalone\C:\Program Files...']`
- **Cause:** The Next.js static asset tracer (`@next/nft`) identifies hardcoded absolute path strings in the PDF module (designed for Windows fallbacks) and attempts to package them into the standalone build outputs.
- **Status:** **This warning is completely harmless.** It does not impact the build success (which exits with code 0) or the integrity of the standalone container build, as these Windows-specific folders are not utilized in the Alpine Linux runtime environment. You can safely ignore this.
- **Verification:** Run `npm run build` locally to verify the `.next/standalone` folder generates correctly before containerizing.

### Logs show: `Mock PDF Generated Successfully - Serverless Fallback Mode`

- **Cause:** The app is falling back to programmatic plain text mode because no browser binary was detected in the environment or `PDF_FORCE_MOCK=true` is enabled.
- **Solution:** For Docker deployments, check the container logs to ensure Chromium is successfully installed at `/usr/bin/chromium-browser` and that `PUPPETEER_EXECUTABLE_PATH` is pointed correctly. If deployed on Vercel, this is the expected and designed fallback behavior to bypass serverless platform limitations.
