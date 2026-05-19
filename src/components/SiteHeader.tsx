import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-semibold text-zinc-900">
          Resume Shapeshifter
        </Link>
        <nav className="flex gap-6 text-sm font-medium">
          <Link className="text-zinc-600 hover:text-zinc-900" href="/">
            Home
          </Link>
          <Link className="text-zinc-600 hover:text-zinc-900" href="/tool">
            Tool
          </Link>
        </nav>
      </div>
    </header>
  );
}
