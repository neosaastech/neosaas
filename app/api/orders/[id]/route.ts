import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/db'
import { orders, orderItems, appointments } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id: orderId } = await params

    // Fetch order with items
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.userId, user.userId)
      ),
      with: {
        items: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Fetch appointments associated with this order
    const orderAppointments = await db.query.appointments.findMany({
      where: and(
        eq(appointments.userId, user.userId)
        // Filter by metadata.orderId if it exists
      )
    })

    // Filter appointments that have this orderId in their metadata
    const relatedAppointments = orderAppointments.filter(apt => 
      apt.metadata && 
      typeof apt.metadata === 'object' && 
      'orderId' in apt.metadata && 
      apt.metadata.orderId === orderId
    )

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          id: item.id,
          itemType: item.itemType,
          itemId: item.itemId,
          itemName: item.itemName,
          itemDescription: item.itemDescription,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          metadata: item.metadata || {}
        })),
        appointments: relatedAppointments.map(apt => ({
          id: apt.id,
          title: apt.title,
          startTime: apt.startTime.toISOString(),
          endTime: apt.endTime.toISOString(),
          timezone: apt.timezone,
          status: apt.status,
          attendeeName: apt.attendeeName,
          attendeeEmail: apt.attendeeEmail,
          price: apt.price,
          currency: apt.currency,
          isPaid: apt.isPaid
        }))
      }
    })
  } catch (error) {
    console.error('[API /orders/[id]] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
