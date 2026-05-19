import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Resume Shapeshifter
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-zinc-600">
          Turn a job description into a <strong>truthful</strong>, better-aligned
          resume draft — with match scoring, gap analysis, and a side-by-side proof
          artifact (PDF in a later phase).
        </p>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Truthfulness</p>
        <p className="mt-1 leading-relaxed">
          This tool is designed to rephrase what you already did — not invent employers,
          degrees, or metrics. Always review every bullet before you apply or export.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Try the tailoring flow
        </h2>
        <p className="text-sm leading-relaxed text-zinc-600">
          Paste your resume and a job description. With{" "}
          <code className="rounded bg-zinc-200 px-1">GROQ_API_KEY</code> in{" "}
          <code className="rounded bg-zinc-200 px-1">.env.local</code>, analysis uses
          Groq; without a key, the app uses mock fixtures so you can still demo the UI.
        </p>
        <Link
          href="/tool"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-zinc-800"
        >
          Open tool
        </Link>
      </section>

      <section className="border-t border-zinc-200 pt-8 text-sm text-zinc-500">
        <p>
          API:{" "}
          <code className="rounded bg-zinc-200 px-1">POST /api/analyze</code>,{" "}
          <code className="rounded bg-zinc-200 px-1">POST /api/tailor</code>,{" "}
          <code className="rounded bg-zinc-200 px-1">POST /api/validate</code>,{" "}
          <code className="rounded bg-zinc-200 px-1">POST /api/runs</code>. See{" "}
          <code className="rounded bg-zinc-200 px-1">README.md</code> and{" "}
          <code className="rounded bg-zinc-200 px-1">progress.md</code>.
        </p>
      </section>
    </main>
  );
}
