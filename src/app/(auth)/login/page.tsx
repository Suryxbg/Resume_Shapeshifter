import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
      <div className="mt-4 text-sm text-zinc-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
          Sign up
        </Link>
      </div>
    </div>
  );
}
