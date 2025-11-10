import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db, users } from "@/lib/db"

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

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Register endpoint hit")

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[v0] Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    console.log("[v0] Register request received:", {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
    })

    let validatedData
    try {
      validatedData = registerSchema.parse(body)
      console.log("[v0] Validation passed")
    } catch (validationError) {
      console.error("[v0] Validation error:", validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation failed", details: validationError.errors }, { status: 400 })
      }
      throw validationError
    }

    // Check if user already exists
    console.log("[v0] Checking for existing user...")
    let existingUser
    try {
      existingUser = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1)
      console.log("[v0] Existing user check complete:", existingUser.length > 0 ? "Found" : "Not found")
    } catch (dbError) {
      console.error("[v0] Database query error:", dbError)
      return NextResponse.json(
        { error: "Database error", message: dbError instanceof Error ? dbError.message : "Unknown error" },
        { status: 500 },
      )
    }

    if (existingUser.length > 0) {
      console.log("[v0] User already exists:", validatedData.email)
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    console.log("[v0] Hashing password...")
    const hashedPassword = await hashPassword(validatedData.password)
    console.log("[v0] Password hashed successfully")

    console.log("[v0] Creating new user...")
    let newUser
    try {
      const result = await db
        .insert(users)
        .values({
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          email: validatedData.email,
          password: hashedPassword, // Now storing hashed password
        })
        .returning()

      newUser = result[0]
      console.log("[v0] User created successfully:", newUser.id)
    } catch (insertError) {
      console.error("[v0] Database insert error:", insertError)
      return NextResponse.json(
        {
          error: "Failed to create user",
          message: insertError instanceof Error ? insertError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

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

    if (error instanceof Error) {
      console.error("[v0] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
    }

    // Always return JSON, even for unexpected errors
    return NextResponse.json(
      {
        error: "Failed to register user",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
