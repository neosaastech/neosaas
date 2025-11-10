import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Login API called")

    const body = await request.json()
    console.log("[v0] Request body received")

    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      console.log("[v0] Validation failed:", parsed.error)
      return NextResponse.json({ error: "Invalid input data", details: parsed.error.errors }, { status: 400 })
    }

    const { email, password } = parsed.data

    console.log("[v0] Looking up user:", email)

    const hashedPassword = await hashPassword(password)

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (!user) {
      console.log("[v0] User not found")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (user.password !== hashedPassword) {
      console.log("[v0] Password mismatch")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] Login successful for user:", user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 })
  }
}
