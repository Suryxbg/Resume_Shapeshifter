import { SignJWT, jwtVerify } from "jose";

export async function getSecretKey() {
  const JWT_SECRET = process.env.JWT_SECRET || "default-dev-secret-key-please-change-in-production";
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    console.warn(
      "WARNING: JWT_SECRET environment variable is missing in production. Using a default fallback key. Please configure JWT_SECRET for security."
    );
  }
  return new TextEncoder().encode(JWT_SECRET);
}

export async function signToken(payload: { userId: string; email: string }) {
  const secretKey = await getSecretKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(token: string) {
  try {
    const secretKey = await getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { userId: string; email: string };
  } catch {
    return null;
  }
}
