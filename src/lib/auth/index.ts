import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";

export type SessionUser = {
  id: string;
  email: string;
};

function parseAuthToken(cookieHeader: string | null): string {
  if (!cookieHeader) return "";
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, value] = c.split("=");
      return [key, decodeURIComponent(value)];
    })
  );
  return cookies.auth_token || "";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  return { id: payload.userId, email: payload.email };
}

export async function getSessionUserFromRequest(
  request: Request
): Promise<SessionUser | null> {
  const token = parseAuthToken(request.headers.get("cookie"));
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  return { id: payload.userId, email: payload.email };
}
