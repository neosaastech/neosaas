/**
 * API Route: Test Booking
 * POST /api/bookings/test - Create a test appointment booking
 *
 * This endpoint is isolated from Lago and payment processing.
 * It creates a booking with status 'pending_payment' for testing purposes.
 *
 * Usage:
 * POST /api/bookings/test
 * {
 *   "serviceId": "uuid-of-product",
 *   "date": "2024-01-15T10:00:00Z",
 *   "attendeeName": "Jean Dupont",
 *   "attendeeEmail": "jean@example.com",
 *   "attendeePhone": "+33612345678" (optional),
 *   "notes": "Additional notes" (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "booking": {
 *     "id": "uuid",
 *     "status": "pending_payment",
 *     "checkoutUrl": "/dashboard/checkout/confirmation?bookingId=uuid"
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { appointments, products, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { verifyAuth } from '@/lib/auth/server'

// Validation schema - isolated from checkout flow
const testBookingSchema = z.object({
  serviceId: z.string().uuid('Service ID invalide'),
  date: z.string().datetime('Date invalide'),
  duration: z.number().min(15).max(480).default(60), // Duration in minutes, default 1h
  attendeeName: z.string().min(1, 'Nom requis'),
  attendeeEmail: z.string().email('Email invalide'),
  attendeePhone: z.string().optional(),
  notes: z.string().optional()
})

// Booking statuses as specified
type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled'

export async function POST(request: NextRequest) {
  console.log('[TestBooking] Starting test booking creation')

  try {
    // 1. Verify authentication (optional for test endpoint)
    let userId: string | null = null
    let userEmail: string | null = null

    try {
      const authResult = await verifyAuth()
      if (authResult) {
        userId = authResult.userId
        const user = await db.query.users.findFirst({
          where: eq(users.id, authResult.userId)
        })
        userEmail = user?.email || null
      }
    } catch (authError) {
      console.log('[TestBooking] No auth - proceeding as guest')
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validationResult = testBookingSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('[TestBooking] Validation failed:', validationResult.error.flatten())
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: validationResult.error.flatten()
        },
        { status: 400 }
      )
    }

    const {
      serviceId,
      date,
      duration,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      notes
    } = validationResult.data

    // 3. Verify service/product exists and is of type 'appointment'
    const product = await db.query.products.findFirst({
      where: eq(products.id, serviceId)
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Service non trouvé' },
        { status: 404 }
      )
    }

    if (product.type !== 'appointment') {
      return NextResponse.json(
        { success: false, error: 'Ce produit ne supporte pas les réservations' },
        { status: 400 }
      )
    }

    // 4. Calculate start and end times
    const startTime = new Date(date)
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + duration)

    // 5. Create the booking with status 'pending_payment'
    // This is isolated from Lago - no invoice creation
    const [booking] = await db.insert(appointments).values({
      userId: userId || '00000000-0000-0000-0000-000000000000', // Guest user placeholder
      productId: serviceId,
      title: `Réservation: ${product.title}`,
      description: product.description || `Rendez-vous pour ${product.title}`,
      startTime,
      endTime,
      timezone: 'Europe/Paris',
      status: 'pending', // Maps to 'pending_payment' conceptually
      type: (product.hourlyRate || 0) > 0 ? 'paid' : 'free',
      price: product.hourlyRate || product.price || 0,
      currency: product.currency || 'EUR',
      isPaid: false,
      paymentStatus: 'pending', // pending_payment status
      attendeeEmail,
      attendeeName,
      attendeePhone: attendeePhone || null,
      notes: notes || null,
      metadata: {
        testMode: true,
        source: 'test_endpoint',
        createdAt: new Date().toISOString()
      }
    }).returning()

    console.log('[TestBooking] Booking created:', {
      bookingId: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      testMode: true
    })

    // 6. Generate confirmation URL
    const checkoutUrl = `/dashboard/checkout/confirmation?bookingId=${booking.id}`

    // 7. Return success response
    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: 'pending_payment', // Mapped status as requested
        serviceId: booking.productId,
        serviceName: product.title,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        timezone: booking.timezone,
        attendeeName: booking.attendeeName,
        attendeeEmail: booking.attendeeEmail,
        price: booking.price,
        currency: booking.currency,
        testMode: true
      },
      checkoutUrl
    })

  } catch (error) {
    console.error('[TestBooking] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la création du rendez-vous'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/bookings/test/[id] - Get a test booking by ID
 * Used for testing and verification
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('id')

  if (!bookingId) {
    return NextResponse.json(
      { success: false, error: 'Booking ID requis' },
      { status: 400 }
    )
  }

  try {
    const booking = await db.query.appointments.findFirst({
      where: eq(appointments.id, bookingId),
      with: {
        product: true
      }
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Réservation non trouvée' },
        { status: 404 }
      )
    }

    // Map internal status to test status
    const mappedStatus: BookingStatus =
      booking.isPaid ? 'confirmed' :
      booking.status === 'cancelled' ? 'cancelled' :
      'pending_payment'

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: mappedStatus,
        serviceId: booking.productId,
        serviceName: booking.product?.title || 'Unknown',
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        timezone: booking.timezone,
        attendeeName: booking.attendeeName,
        attendeeEmail: booking.attendeeEmail,
        price: booking.price,
        currency: booking.currency,
        isPaid: booking.isPaid,
        createdAt: booking.createdAt.toISOString()
      }
    })
  } catch (error) {
    console.error('[TestBooking] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération' },
      { status: 500 }
    )
  }
}
