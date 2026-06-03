import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { hashPassword } from "@/lib/hash";
import { signToken } from "@/lib/jwt";
import { eq } from "drizzle-orm";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { name, email, password } = result.data;

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    await db.insert(users).values({
      name,
      email,
      passwordHash,
    });

    // Get the created user to get the ID
    const newUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = newUser[0];

    // Generate token
    const token = await signToken({ userId: user.id, email: user.email });

    // Set cookie
    const response = NextResponse.json({
      message: "User created successfully",
      user: { id: user.id, name: user.name, email: user.email }
    }, { status: 201 });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
