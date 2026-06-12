import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";
import Link from "next/link";

type SignupPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { returnTo } = await searchParams;
  const loginHref = returnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-sm text-zinc-500">Loading…</div>}>
        <SignupForm />
      </Suspense>
      <div className="mt-4 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-blue-600 hover:text-blue-500">
          Sign in
        </Link>
      </div>
    </div>
  );
}
