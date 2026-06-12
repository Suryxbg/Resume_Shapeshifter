import Link from "next/link";
import { cookies } from "next/headers";
import { AuthButtons } from "@/components/auth/AuthButtons";

export async function SiteHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  let user = null;
  let debugError = "";

  if (token) {
    try {
      const { jwtVerify } = await import("jose");
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET missing in SiteHeader");
      const secretKey = new TextEncoder().encode(secret);
      const { payload } = await jwtVerify(token, secretKey);
      if (payload) {
        user = { email: payload.email as string, userId: payload.userId as string };
      }
    } catch (e: unknown) {
      debugError = e instanceof Error ? e.message : String(e);
      // Force user to be truthy so we can see the error in the UI
      user = { email: "ERROR: " + debugError, userId: "error" };
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
