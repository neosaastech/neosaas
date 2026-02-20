import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { appointments, users } from '@/db/schema'
import { eq, and, desc, gte, lte, or } from 'drizzle-orm'
import { verifyAuth } from '@/lib/auth/server'
import { z } from 'zod'
import { syncAppointmentToCalendars } from '@/lib/calendar/sync'
import { sendAdminNotification } from '@/lib/notifications/admin-notifications'

// Force dynamic to prevent caching issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string().default("Europe/Paris"),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).default('pending'),
  type: z.enum(['free', 'paid']).default('free'),
  price: z.number().int().min(0).default(0),
  currency: z.string().default("EUR"),
  productId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(), // Link to order
  attendeeEmail: z.string().email().optional(),
  attendeeName: z.string().optional(),
  attendeePhone: z.string().optional(),
  notes: z.string().optional(),
  syncToCalendar: z.boolean().optional().default(true),
  isPaid: z.boolean().optional(), // Allow explicit isPaid setting
})

// GET /api/appointments - List appointments
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('[API /appointments GET] Fetching appointments for user:', user.userId)
    console.log('[API /appointments GET] Filters:', { status, type, startDate, endDate, limit })

    const conditions = [eq(appointments.userId, user.userId)]

    if (status) {
      conditions.push(eq(appointments.status, status))
    }
    if (type) {
      conditions.push(eq(appointments.type, type))
    }
    if (startDate) {
      conditions.push(gte(appointments.startTime, new Date(startDate)))
    }
    if (endDate) {
      conditions.push(lte(appointments.endTime, new Date(endDate)))
    }

    const result = await db.query.appointments.findMany({
      where: and(...conditions),
      orderBy: [desc(appointments.startTime)],
      limit,
      with: {
        product: true,
      },
    })

    console.log('[API /appointments GET] Found', result.length, 'appointments')
    if (result.length > 0) {
      console.log('[API /appointments GET] First appointment:', result[0].id, result[0].title, result[0].startTime)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[API /appointments GET] Failed to fetch appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

// POST /api/appointments - Create appointment
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = appointmentSchema.parse(body)

    const startTime = new Date(validated.startTime)
    const endTime = new Date(validated.endTime)

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    // Check for overlapping appointments
    const overlapping = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.userId, user.userId),
        or(
          eq(appointments.status, 'pending'),
          eq(appointments.status, 'confirmed')
        ),
        or(
          and(
            lte(appointments.startTime, startTime),
            gte(appointments.endTime, startTime)
          ),
          and(
            lte(appointments.startTime, endTime),
            gte(appointments.endTime, endTime)
          ),
          and(
            gte(appointments.startTime, startTime),
            lte(appointments.endTime, endTime)
          )
        )
      ),
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'This time slot overlaps with an existing appointment' },
        { status: 409 }
      )
    }

    // Determine isPaid: use explicit value if provided, otherwise base on type
    const isPaid = validated.isPaid !== undefined ? validated.isPaid : (validated.type === 'free')
    const paymentStatus = isPaid ? 'paid' : 'pending'

    console.log('[API /appointments] Creating appointment for user:', user.userId)
    console.log('[API /appointments] Appointment data:', {
      title: validated.title,
      startTime: validated.startTime,
      endTime: validated.endTime,
      startTimeParsed: startTime.toISOString(),
      endTimeParsed: endTime.toISOString(),
      type: validated.type,
      status: validated.status,
      isPaid,
      paymentStatus,
      productId: validated.productId,
      attendeeName: validated.attendeeName,
      attendeeEmail: validated.attendeeEmail
    })

    const [result] = await db.insert(appointments).values({
      userId: user.userId,
      title: validated.title,
      description: validated.description || null,
      location: validated.location || null,
      meetingUrl: validated.meetingUrl || null,
      startTime,
      endTime,
      timezone: validated.timezone,
      status: validated.status,
      type: validated.type,
      price: validated.price,
      currency: validated.currency,
      productId: validated.productId || null,
      attendeeEmail: validated.attendeeEmail || null,
      attendeeName: validated.attendeeName || null,
      attendeePhone: validated.attendeePhone || null,
      notes: validated.notes || null,
      isPaid,
      paymentStatus,
    }).returning()

    console.log('[API /appointments] Appointment created successfully!')
    console.log('[API /appointments] Created appointment ID:', result.id)
    console.log('[API /appointments] Full result:', JSON.stringify(result, null, 2))

    // Sync to external calendars if requested
    if (validated.syncToCalendar) {
      try {
        await syncAppointmentToCalendars(result.id)
      } catch (syncError) {
        console.error('Calendar sync failed:', syncError)
        // Don't fail the request if sync fails
      }
    }

    // Send notification to admin for new appointment requests
    try {
      // Fetch user info for the notification
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, user.userId),
        columns: {
          firstName: true,
          lastName: true,
          email: true,
        }
      })

      const userName = userInfo?.firstName && userInfo?.lastName
        ? `${userInfo.firstName} ${userInfo.lastName}`
        : userInfo?.email || user.email

      const formattedStartTime = startTime.toLocaleString('fr-FR', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: validated.timezone
      })

      const formattedEndTime = endTime.toLocaleString('fr-FR', {
        timeStyle: 'short',
        timeZone: validated.timezone
      })

      await sendAdminNotification({
        subject: `Nouvelle demande de RDV - ${validated.title}`,
        message: `📅 **Nouvelle demande de rendez-vous**\n\n` +
          `**Titre:** ${validated.title}\n` +
          `**Client:** ${userName} (${userInfo?.email || user.email})\n` +
          `**Date:** ${formattedStartTime} - ${formattedEndTime}\n` +
          (validated.description ? `**Description:** ${validated.description}\n` : '') +
          (validated.location ? `**Lieu:** ${validated.location}\n` : '') +
          (validated.meetingUrl ? `**Visio:** ${validated.meetingUrl}\n` : '') +
          `\n---\n` +
          `📌 **Action requise:** Confirmez ou refusez cette demande.\n` +
          `Si un paiement est nécessaire, configurez-le avant de confirmer.\n\n` +
          `[Voir le rendez-vous](/dashboard/appointments/${result.id})`,
        type: 'appointment',
        userId: user.userId,
        userEmail: userInfo?.email || user.email,
        userName,
        priority: 'high',
        metadata: {
          appointmentId: result.id,
          title: validated.title,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }
      })
      console.log('[API /appointments] Admin notification sent for new appointment')
    } catch (notifyError) {
      console.error('[API /appointments] Failed to send admin notification:', notifyError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Failed to create appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}
