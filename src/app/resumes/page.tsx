import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resumeHistory } from "@/lib/db/schema";

export default async function ResumesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/resumes");
  }

  const rows = await db
    .select({
      id: resumeHistory.id,
      jobTitle: resumeHistory.jobTitle,
      companyName: resumeHistory.companyName,
      atsScore: resumeHistory.atsScore,
      createdAt: resumeHistory.createdAt,
    })
    .from(resumeHistory)
    .where(eq(resumeHistory.userId, user.id))
    .orderBy(desc(resumeHistory.createdAt));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Resumes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Previously saved tailored resumes from your account.
          </p>
        </div>
        <Link
          href="/tool"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800"
        >
          New tailoring session
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-sm text-zinc-600">
            No saved resumes yet. Generate a tailored resume in the tool, then
            save it to your account.
          </p>
          <Link
            href="/tool"
            className="mt-4 inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            Open tool
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/resumes/${row.id}`}
                className="block rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:border-zinc-300 hover:shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">{row.jobTitle}</p>
                    {row.companyName ? (
                      <p className="text-sm text-zinc-600">{row.companyName}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-zinc-500">
                    {row.atsScore != null ? (
                      <p className="font-medium text-zinc-800">
                        ATS score: {row.atsScore}
                      </p>
                    ) : null}
                    <p>
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
