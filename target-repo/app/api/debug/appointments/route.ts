import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { appointments, users } from '@/db/schema'
import { verifyAuth } from '@/lib/auth/server'
import { desc, eq, sql } from 'drizzle-orm'

/**
 * DEBUG ENDPOINT - To be removed after debugging
 * GET /api/debug/appointments
 * Returns all appointments and debug info
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth()

    console.log('[DEBUG] verifyAuth result:', user)

    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized',
        debug: { user: null }
      }, { status: 401 })
    }

    // Get user record to verify it exists
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, user.userId)
    })

    console.log('[DEBUG] User record:', userRecord?.id, userRecord?.email)

    // Count total appointments in the database (no filters)
    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(appointments)
    const totalCount = Number(totalCountResult[0]?.count || 0)

    console.log('[DEBUG] Total appointments in DB:', totalCount)

    // Get ALL appointments (no user filter) - limit 10
    const allAppointments = await db.query.appointments.findMany({
      orderBy: [desc(appointments.createdAt)],
      limit: 10,
    })

    console.log('[DEBUG] All appointments (last 10):', allAppointments.length)

    // Get appointments for this user
    const userAppointments = await db.query.appointments.findMany({
      where: eq(appointments.userId, user.userId),
      orderBy: [desc(appointments.createdAt)],
      limit: 10,
    })

    console.log('[DEBUG] User appointments:', userAppointments.length)

    // Count appointments per user
    const appointmentsByUser = await db.select({
      userId: appointments.userId,
      count: sql<number>`count(*)`
    })
      .from(appointments)
      .groupBy(appointments.userId)

    return NextResponse.json({
      success: true,
      debug: {
        currentUser: {
          jwtUserId: user.userId,
          dbUserId: userRecord?.id,
          email: userRecord?.email,
          match: user.userId === userRecord?.id
        },
        stats: {
          totalAppointmentsInDb: totalCount,
          appointmentsForCurrentUser: userAppointments.length,
          appointmentsByUser: appointmentsByUser
        },
        recentAppointments: {
          all: allAppointments.map(a => ({
            id: a.id,
            userId: a.userId,
            title: a.title,
            startTime: a.startTime,
            status: a.status,
            createdAt: a.createdAt
          })),
          forCurrentUser: userAppointments.map(a => ({
            id: a.id,
            title: a.title,
            startTime: a.startTime,
            status: a.status,
            createdAt: a.createdAt
          }))
        }
      }
    })
  } catch (error) {
    console.error('[DEBUG] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * POST /api/debug/appointments
 * Creates a test appointment and immediately retrieves it
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[DEBUG POST] Creating test appointment for user:', user.userId)

    // Create a test appointment
    const now = new Date()
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour duration

    const [created] = await db.insert(appointments).values({
      userId: user.userId,
      title: `Test RDV - ${now.toISOString()}`,
      description: 'Debug test appointment',
      startTime,
      endTime,
      timezone: 'Europe/Paris',
      status: 'confirmed',
      type: 'free',
      price: 0,
      currency: 'EUR',
      isPaid: true,
      paymentStatus: 'paid',
      attendeeName: 'Test User',
      attendeeEmail: 'test@example.com',
    }).returning()

    console.log('[DEBUG POST] Created appointment:', created.id)

    // Immediately try to fetch it back
    const fetched = await db.query.appointments.findFirst({
      where: eq(appointments.id, created.id)
    })

    console.log('[DEBUG POST] Fetched back:', fetched?.id)

    // Count all appointments for this user
    const userAppointments = await db.query.appointments.findMany({
      where: eq(appointments.userId, user.userId),
    })

    return NextResponse.json({
      success: true,
      test: {
        created: {
          id: created.id,
          userId: created.userId,
          title: created.title,
          startTime: created.startTime,
          createdAt: created.createdAt
        },
        fetchedBack: fetched ? {
          id: fetched.id,
          userId: fetched.userId,
          title: fetched.title
        } : null,
        fetchSuccess: !!fetched,
        totalUserAppointments: userAppointments.length
      }
    })
  } catch (error) {
    console.error('[DEBUG POST] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
