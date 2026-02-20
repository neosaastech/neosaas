import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { appointments } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyAuth, isAdmin } from '@/lib/auth/server'
import { z } from 'zod'
import { syncAppointmentToCalendars, deleteAppointmentFromCalendars } from '@/lib/calendar/sync'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  type: z.enum(['free', 'paid']).optional(),
  price: z.number().int().min(0).optional(),
  currency: z.string().optional(),
  productId: z.string().uuid().optional().nullable(),
  attendeeEmail: z.string().email().optional(),
  attendeeName: z.string().optional(),
  attendeePhone: z.string().optional(),
  notes: z.string().optional(),
  cancellationReason: z.string().optional(),
  syncToCalendar: z.boolean().optional().default(true),
  assignedAdminId: z.string().uuid().optional().nullable(),
})

// GET /api/appointments/[id] - Get single appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const appointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
      with: {
        product: true,
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: appointment })
  } catch (error) {
    console.error('Failed to fetch appointment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    )
  }
}

// PUT /api/appointments/[id] - Update appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validated = updateSchema.parse(body)

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.userId)

    // Check if appointment exists
    // Admins can access all appointments, regular users only their own
    const existing = await db.query.appointments.findFirst({
      where: userIsAdmin
        ? eq(appointments.id, id)
        : and(eq(appointments.id, id), eq(appointments.userId, user.userId)),
    })

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Clients can confirm their own appointments if they were in 'pending' status
    // Admins can change to any status
    if (validated.status === 'confirmed') {
      const isOwnAppointment = existing.userId === user.userId
      const wasPending = existing.status === 'pending'
      
      if (!userIsAdmin && (!isOwnAppointment || !wasPending)) {
        return NextResponse.json(
          { error: 'You can only confirm your own pending appointments' },
          { status: 403 }
        )
      }
    }

    // Only admins can mark appointments as completed
    if (validated.status === 'completed') {
      if (!userIsAdmin) {
        return NextResponse.json(
          { error: 'Only administrators can mark appointments as completed' },
          { status: 403 }
        )
      }
    }

    // Only admins can assign appointments to other admins
    if (validated.assignedAdminId !== undefined && !userIsAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can assign appointments' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.location !== undefined) updateData.location = validated.location
    if (validated.meetingUrl !== undefined) updateData.meetingUrl = validated.meetingUrl || null
    if (validated.startTime !== undefined) updateData.startTime = new Date(validated.startTime)
    if (validated.endTime !== undefined) updateData.endTime = new Date(validated.endTime)
    if (validated.timezone !== undefined) updateData.timezone = validated.timezone
    if (validated.status !== undefined) {
      updateData.status = validated.status
      if (validated.status === 'cancelled') {
        updateData.cancelledAt = new Date()
        if (validated.cancellationReason) {
          updateData.cancellationReason = validated.cancellationReason
        }
      }
    }
    if (validated.type !== undefined) updateData.type = validated.type
    if (validated.price !== undefined) updateData.price = validated.price
    if (validated.currency !== undefined) updateData.currency = validated.currency
    if (validated.productId !== undefined) updateData.productId = validated.productId
    if (validated.attendeeEmail !== undefined) updateData.attendeeEmail = validated.attendeeEmail
    if (validated.attendeeName !== undefined) updateData.attendeeName = validated.attendeeName
    if (validated.attendeePhone !== undefined) updateData.attendeePhone = validated.attendeePhone
    if (validated.notes !== undefined) updateData.notes = validated.notes
    if (validated.assignedAdminId !== undefined) updateData.assignedAdminId = validated.assignedAdminId

    const [result] = await db.update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning()

    // Sync to external calendars if requested
    if (validated.syncToCalendar !== false) {
      try {
        await syncAppointmentToCalendars(id)
      } catch (syncError) {
        console.error('Calendar sync failed:', syncError)
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Failed to update appointment:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}

// DELETE /api/appointments/[id] - Delete appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
    })

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Delete from external calendars first
    try {
      await deleteAppointmentFromCalendars(id)
    } catch (syncError) {
      console.error('Failed to delete from external calendars:', syncError)
    }

    await db.delete(appointments).where(eq(appointments.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete appointment:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    )
  }
}
