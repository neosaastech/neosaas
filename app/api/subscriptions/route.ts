import { type NextRequest, NextResponse } from "next/server"
import { getUserSubscription, createSubscription } from "@/lib/db/queries"
import { z } from "zod"

const createSubscriptionSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["starter", "pro", "enterprise"]),
  status: z.enum(["active", "canceled", "past_due", "trialing"]),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createSubscriptionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request data", details: parsed.error.errors }, { status: 400 })
    }

    const subscription = await createSubscription(parsed.data)

    return NextResponse.json({ message: "Subscription created successfully", subscription }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required" }, { status: 400 })
    }

    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found for this user" }, { status: 404 })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error("[v0] Error fetching subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
