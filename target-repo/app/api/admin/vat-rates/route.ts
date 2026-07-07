import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { vatRates } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, country, rate, description, isDefault, isActive } = body

    // Validate required fields
    if (!name || !country || rate === undefined) {
      return NextResponse.json(
        { error: "Name, country, and rate are required" },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults for this country
    if (isDefault) {
      await db
        .update(vatRates)
        .set({ isDefault: false })
        .where(eq(vatRates.country, country))
    }

    const [newRate] = await db
      .insert(vatRates)
      .values({
        name,
        country,
        rate,
        description: description || null,
        isDefault: isDefault || false,
        isActive: isActive ?? true,
      })
      .returning()

    return NextResponse.json(newRate)
  } catch (error) {
    console.error("Error creating VAT rate:", error)
    return NextResponse.json(
      { error: "Failed to create VAT rate" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")
    const activeOnly = searchParams.get("activeOnly") === "true"

    let query = db.select().from(vatRates)

    if (country) {
      query = query.where(eq(vatRates.country, country)) as any
    }

    if (activeOnly) {
      query = query.where(eq(vatRates.isActive, true)) as any
    }

    const rates = await query

    return NextResponse.json(rates)
  } catch (error) {
    console.error("Error fetching VAT rates:", error)
    return NextResponse.json(
      { error: "Failed to fetch VAT rates" },
      { status: 500 }
    )
  }
}
