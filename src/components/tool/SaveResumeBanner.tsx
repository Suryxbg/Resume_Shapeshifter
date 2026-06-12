"use client";

import Link from "next/link";
import { buildAuthRedirectUrl } from "@/lib/resume/pending";

type SaveResumeBannerProps = {
  isAuthenticated: boolean;
  isSaved: boolean;
  isSaving: boolean;
  saveError: string | null;
  onSave: () => void;
  onAuthRedirect: () => void;
  returnTo?: string;
};

export function SaveResumeBanner({
  isAuthenticated,
  isSaved,
  isSaving,
  saveError,
  onSave,
  onAuthRedirect,
  returnTo = "/tool",
}: SaveResumeBannerProps) {
  if (isAuthenticated && isSaved) {
    return (
      <div
        className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm"
        role="status"
      >
        <p className="text-sm font-semibold text-green-900">
          Resume saved to your account.
        </p>
        <p className="mt-1 text-xs text-green-800">
          Access it anytime from{" "}
          <Link href="/resumes" className="font-medium underline">
            My Resumes
          </Link>
          .
        </p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Save this tailored resume
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Store it in your account to access and download later.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSaving ? "Saving…" : "Save Resume"}
          </button>
        </div>
        {saveError ? (
          <p className="mt-3 text-xs text-red-700" role="alert">
            {saveError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm">
      <p className="text-sm font-semibold text-blue-950">
        Save your tailored resumes and access them anytime.
      </p>
      <p className="mt-1 text-xs text-blue-900">
        Sign in to save this resume and access it later. Your generated content
        will be preserved during sign-in.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={buildAuthRedirectUrl("/signup", returnTo)}
          onClick={onAuthRedirect}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800"
        >
          Sign Up
        </Link>
        <Link
          href={buildAuthRedirectUrl("/login", returnTo)}
          onClick={onAuthRedirect}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
