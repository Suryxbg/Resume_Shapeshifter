import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET || "default-dev-secret-key-please-change-in-production";
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    console.warn(
      "WARNING: JWT_SECRET environment variable is missing in middleware. Using fallback."
    );
  }
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  // Define protected routes (currently none exist, but preparing for future)
  const protectedPaths = ["/resumes", "/profile"];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPath) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(token, getSecretKey());
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isAuthPath) {
    const token = request.cookies.get("auth_token")?.value;
    if (token) {
      try {
        await jwtVerify(token, getSecretKey());
        const returnTo = request.nextUrl.searchParams.get("returnTo");
        const destination = returnTo?.startsWith("/") ? returnTo : "/";
        return NextResponse.redirect(new URL(destination, request.url));
      } catch {
        // Invalid token, allow access to login/signup
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
