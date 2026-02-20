import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { vatRates } from "@/db/schema"
import { eq } from "drizzle-orm"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { country } = body

    if (!country) {
      return NextResponse.json(
        { error: "Country is required" },
        { status: 400 }
      )
    }

    // Unset all defaults for this country
    await db
      .update(vatRates)
      .set({ isDefault: false })
      .where(eq(vatRates.country, country))

    // Set this rate as default
    const [updated] = await db
      .update(vatRates)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(vatRates.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, rate: updated })
  } catch (error) {
    console.error("Error setting default VAT rate:", error)
    return NextResponse.json(
      { error: "Failed to set default VAT rate" },
      { status: 500 }
    )
  }
}
