import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/server'
import { db } from '@/db'
import { appointments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendAllAppointmentNotifications } from '@/lib/notifications/appointment-notifications'

/**
 * POST /api/appointments/[id]/notify
 * Send email notifications for an appointment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: appointmentId } = await params

    // Fetch the appointment
    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
      with: {
        product: true
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Check if user owns this appointment
    if (appointment.userId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    console.log('[API /appointments/notify] Sending notifications for appointment:', appointmentId)

    // Send all notifications
    const results = await sendAllAppointmentNotifications({
      appointmentId: appointment.id,
      productTitle: appointment.title,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      timezone: appointment.timezone,
      attendeeName: appointment.attendeeName || 'Client',
      attendeeEmail: appointment.attendeeEmail || '',
      attendeePhone: appointment.attendeePhone || undefined,
      price: appointment.price,
      currency: appointment.currency,
      notes: appointment.notes || undefined,
      userId: user.userId
    })

    console.log('[API /appointments/notify] Notification results:', results)

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('[API /appointments/notify] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
