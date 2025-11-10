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
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request data", details: parsed.error.errors }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(parsed.data.email)
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Create new user
    const user = await createUser(parsed.data)

    return NextResponse.json(
      { message: "User created successfully", user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 })
    }

    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    })
  } catch (error) {
    console.error("[v0] Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
