import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { AuthButtons } from "@/components/auth/AuthButtons";

export async function SiteHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  let user = null;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      user = { email: payload.email, userId: payload.userId };
    }
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-semibold text-zinc-900">
          Resume Shapeshifter
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link className="text-zinc-600 hover:text-zinc-900" href="/">
            Home
          </Link>
          <Link className="text-zinc-600 hover:text-zinc-900" href="/tool">
            Tool
          </Link>
          <AuthButtons user={user} />
        </nav>
      </div>
    </header>
  );
}
