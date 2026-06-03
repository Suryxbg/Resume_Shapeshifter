"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AuthButtons({ user }: { user: { email: string } | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh(); // refresh the server component
  };

  if (user) {
    return (
      <div className="flex items-center gap-4 border-l border-zinc-200 pl-4 ml-2">
        <span className="text-sm text-zinc-600">{user.email}</span>
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
      <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
        Log in
      </Link>
      <Link
        href="/signup"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Sign up
      </Link>
    </div>
  );
}
