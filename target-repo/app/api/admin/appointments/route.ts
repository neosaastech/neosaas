import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { appointments, users } from '@/db/schema'
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm'
import { verifyAuth } from '@/lib/auth/server'

// Force dynamic to prevent caching issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/admin/appointments - List ALL appointments (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you may want to enhance this check)
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')

    console.log('[API /admin/appointments GET] Fetching all appointments')
    console.log('[API /admin/appointments GET] Filters:', { status, type, startDate, endDate, limit })

    // Build query - get all appointments with user info and assigned admin
    const result = await db.query.appointments.findMany({
      where: and(
        status ? eq(appointments.status, status) : undefined,
        type ? eq(appointments.type, type) : undefined,
        startDate ? gte(appointments.startTime, new Date(startDate)) : undefined,
        endDate ? lte(appointments.endTime, new Date(endDate)) : undefined
      ),
      orderBy: [desc(appointments.startTime)],
      limit,
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        product: true,
        assignedAdmin: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    console.log('[API /admin/appointments GET] Found', result.length, 'appointments')
    if (result.length > 0) {
      console.log('[API /admin/appointments GET] First appointment:', result[0].id, result[0].title, result[0].startTime)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to fetch appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

// POST /api/admin/appointments - Create appointment or get stats
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Action: Get stats
    if (body.action === 'stats') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const monthAppointments = await db.query.appointments.findMany({
        where: and(
          gte(appointments.startTime, startOfMonth),
          lte(appointments.startTime, endOfMonth)
        ),
      })

      const stats = {
        total: monthAppointments.length,
        pending: monthAppointments.filter(a => a.status === 'pending').length,
        confirmed: monthAppointments.filter(a => a.status === 'confirmed').length,
        completed: monthAppointments.filter(a => a.status === 'completed').length,
        cancelled: monthAppointments.filter(a => a.status === 'cancelled').length,
        noShow: monthAppointments.filter(a => a.status === 'no_show').length,
        paidAppointments: monthAppointments.filter(a => a.isPaid).length,
        unpaidAppointments: monthAppointments.filter(a => !a.isPaid && a.type === 'paid').length,
        totalRevenue: monthAppointments
          .filter(a => a.isPaid && a.type === 'paid')
          .reduce((sum, a) => sum + (a.price || 0), 0),
        unpaidAmount: monthAppointments
          .filter(a => !a.isPaid && a.type === 'paid')
          .reduce((sum, a) => sum + (a.price || 0), 0),
      }

      return NextResponse.json({ success: true, data: stats })
    }

    // Action: Create appointment (admin requests appointment with client)
    if (body.action === 'create') {
      const {
        clientEmail,
        title,
        description,
        startTime,
        endTime,
        timezone = 'Europe/Paris',
        type = 'free',
        price = 0,
        currency = 'EUR',
        location,
        meetingUrl,
        notes,
      } = body

      // Validate required fields
      if (!clientEmail || !title || !startTime || !endTime) {
        return NextResponse.json(
          { error: 'Missing required fields: clientEmail, title, startTime, endTime' },
          { status: 400 }
        )
      }

      // Find client user by email
      const clientUser = await db.query.users.findFirst({
        where: eq(users.email, clientEmail),
      })

      if (!clientUser) {
        return NextResponse.json(
          { error: 'Client not found with this email' },
          { status: 404 }
        )
      }

      // Create appointment with status 'pending' (awaiting client confirmation)
      const [newAppointment] = await db.insert(appointments).values({
        userId: clientUser.id,
        assignedAdminId: user.userId, // Admin who created the request
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        timezone,
        status: 'pending', // Client needs to confirm
        type,
        price,
        currency,
        isPaid: false,
        location,
        meetingUrl,
        notes,
        attendeeEmail: clientUser.email,
        attendeeName: `${clientUser.firstName} ${clientUser.lastName}`,
        attendeePhone: clientUser.phone,
      }).returning()

      console.log('[API /admin/appointments POST] Created appointment request:', newAppointment.id)

      // TODO: Send notification email to client about the appointment request

      return NextResponse.json({
        success: true,
        data: newAppointment,
        message: 'Appointment request sent to client'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to process request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
