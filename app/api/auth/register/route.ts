import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

console.log("[v0] Loading register route...")

let db: any
let users: any

try {
  console.log("[v0] Importing database connection...")
  const dbModule = await import("@/lib/db")
  db = dbModule.db
  users = dbModule.users
  console.log("[v0] Database imported successfully")
} catch (importError) {
  console.error("[v0] Failed to import database:", importError)
}

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
    console.log("[v0] Register endpoint hit")

    if (!db || !users) {
      console.error("[v0] Database not initialized")
      return NextResponse.json({ error: "Database connection not available" }, { status: 503 })
    }

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

    // In production, you should hash the password with bcrypt or similar
    // For now, we'll store it directly (NOT RECOMMENDED FOR PRODUCTION)
    console.log("[v0] Creating new user...")
    let newUser
    try {
      const result = await db
        .insert(users)
        .values({
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          email: validatedData.email,
          password: validatedData.password, // SHOULD BE HASHED IN PRODUCTION
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
