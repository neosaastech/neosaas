import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, createUser } from "@/lib/db/queries"
import { z } from "zod"

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(8).optional(),
})

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] POST /api/users - Starting user creation")

    const body = await request.json()
    console.log("[v0] Request body received:", { email: body.email, hasName: !!body.name })

    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      console.log("[v0] Validation failed:", parsed.error.errors)
      return NextResponse.json({ error: "Invalid request data", details: parsed.error.errors }, { status: 400 })
    }

    console.log("[v0] Checking if user exists:", parsed.data.email)
    // Check if user already exists
    const existingUser = await getUserByEmail(parsed.data.email)
    if (existingUser) {
      console.log("[v0] User already exists")
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    console.log("[v0] Creating new user...")
    // Create new user
    const user = await createUser(parsed.data)
    console.log("[v0] User created successfully:", { id: user.id, email: user.email })

    return NextResponse.json(
      { message: "User created successfully", user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Error creating user:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] GET /api/users - Fetching user")

    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 })
    }

    console.log("[v0] Looking up user:", email)
    const user = await getUserByEmail(email)

    if (!user) {
      console.log("[v0] User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] User found:", { id: user.id, email: user.email })
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    })
  } catch (error) {
    console.error("[v0] Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
