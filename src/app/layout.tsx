import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Shapeshifter",
  description:
    "JD-to-resume tailoring with match scoring, gap analysis, and exportable proof artifacts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
