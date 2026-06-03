import { SignJWT, jwtVerify } from "jose";

export async function getSecretKey() {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in environment variables");
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
