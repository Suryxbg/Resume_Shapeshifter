"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AuthButtons({
  user,
}: {
  user: { email: string; userId?: string } | null;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  };

  if (user) {
    return (
      <div className="flex items-center gap-4 border-l border-zinc-200 pl-4 ml-2">
        {user.email.startsWith("ERROR:") && (
          <span className="text-xs text-red-600 font-bold max-w-[200px] truncate" title={user.email}>
            {user.email}
          </span>
        )}
        <Link
          href="/resumes"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          My Resumes
        </Link>
        <Link
          href="/profile"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          Profile
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 border-l border-zinc-200 pl-4 ml-2">
      <Link
        href="/login"
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        Login
      </Link>
      <Link
        href="/signup"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Sign Up
      </Link>
    </div>
  );
}
