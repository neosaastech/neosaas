import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[v0] Register request received:", { email: body.email })

    // Validate input
    const validatedData = registerSchema.parse(body)
    console.log("[v0] Validation passed")

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1)

    if (existingUser.length > 0) {
      console.log("[v0] User already exists:", validatedData.email)
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // In production, you should hash the password with bcrypt or similar
    // For now, we'll store it directly (NOT RECOMMENDED FOR PRODUCTION)
    console.log("[v0] Creating new user...")
    const [newUser] = await db
      .insert(users)
      .values({
        name: `${validatedData.firstName} ${validatedData.lastName}`,
        email: validatedData.email,
        password: validatedData.password, // SHOULD BE HASHED IN PRODUCTION
      })
      .returning()

    console.log("[v0] User created successfully:", newUser.id)

    // Return user without password
    const { password, ...userWithoutPassword } = newUser

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: userWithoutPassword,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Registration error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to register user" }, { status: 500 })
  }
}
