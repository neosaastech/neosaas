import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { vatRates } from "@/db/schema"
import { eq } from "drizzle-orm"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const [rate] = await db.select().from(vatRates).where(eq(vatRates.id, id))

    if (!rate) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(rate)
  } catch (error) {
    console.error("Error fetching VAT rate:", error)
    return NextResponse.json(
      { error: "Failed to fetch VAT rate" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, country, rate, description, isDefault, isActive } = body

    // If setting as default, unset other defaults for this country
    if (isDefault) {
      await db
        .update(vatRates)
        .set({ isDefault: false })
        .where(eq(vatRates.country, country))
    }

    const [updated] = await db
      .update(vatRates)
      .set({
        name,
        country,
        rate,
        description: description || null,
        isDefault: isDefault || false,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(vatRates.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating VAT rate:", error)
    return NextResponse.json(
      { error: "Failed to update VAT rate" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const [updated] = await db
      .update(vatRates)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(vatRates.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating VAT rate:", error)
    return NextResponse.json(
      { error: "Failed to update VAT rate" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const [deleted] = await db
      .delete(vatRates)
      .where(eq(vatRates.id, id))
      .returning()

    if (!deleted) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting VAT rate:", error)
    return NextResponse.json(
      { error: "Failed to delete VAT rate" },
      { status: 500 }
    )
  }
}
