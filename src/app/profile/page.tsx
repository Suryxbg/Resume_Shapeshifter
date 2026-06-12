import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?returnTo=/profile");
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  const user = rows[0];
  if (!user) {
    redirect("/login?returnTo=/profile");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Your account details for Resume Shapeshifter.
      </p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white px-6 py-5 shadow-sm">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-zinc-500">Name</dt>
            <dd className="mt-1 text-zinc-900">{user.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500">Email</dt>
            <dd className="mt-1 text-zinc-900">{user.email}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500">Member since</dt>
            <dd className="mt-1 text-zinc-900">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6">
        <Link
          href="/resumes"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          View My Resumes →
        </Link>
      </div>
    </main>
  );
}
