import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/server"
import { db } from "@/db"
import { orders } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await requireAdmin()

    const { orderId } = params

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        user: true,
        company: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, order })

  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await requireAdmin()

    const { orderId } = params
    const body = await request.json()
    const { status, notes } = body

    // Mettre à jour la commande
    const updatedOrder = await db
      .update(orders)
      .set({
        status,
        ...(notes && { notes }),
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning()

    if (!updatedOrder || updatedOrder.length === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      order: updatedOrder[0]
    })

  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}
