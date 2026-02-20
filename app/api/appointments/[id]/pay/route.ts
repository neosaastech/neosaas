import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { appointments, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyAuth } from '@/lib/auth/server'
import { getStripeCredentials } from '@/lib/stripe'

// POST /api/appointments/[id]/pay - Initiate payment for appointment via Stripe Checkout
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the appointment
    const appointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (appointment.isPaid) {
      return NextResponse.json({ error: 'Appointment is already paid' }, { status: 400 })
    }

    if (appointment.type !== 'paid' || appointment.price <= 0) {
      return NextResponse.json({ error: 'This appointment does not require payment' }, { status: 400 })
    }

    // Get user info
    const userInfo = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    })

    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get Stripe credentials
    const creds = await getStripeCredentials()

    if (!creds || !creds.secretKey) {
      // Development fallback: create a pending payment record without Stripe
      await db.update(appointments)
        .set({
          paymentStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, id))

      return NextResponse.json({
        success: true,
        data: {
          message: 'Stripe not configured — payment pending (development mode)',
          amount: appointment.price,
          currency: appointment.currency,
        },
      })
    }

    // Create a Stripe Checkout Session for the appointment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const lineItems = new URLSearchParams({
      mode: 'payment',
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': appointment.currency,
      'line_items[0][price_data][unit_amount]': String(appointment.price),
      'line_items[0][price_data][product_data][name]': appointment.title || 'Appointment',
      'line_items[0][price_data][product_data][description]': appointment.description || '',
      'line_items[0][quantity]': '1',
      customer_email: userInfo.email,
      'metadata[appointment_id]': id,
      'metadata[user_id]': user.userId,
      success_url: `${appUrl}/dashboard/appointments/${id}?payment=success`,
      cancel_url: `${appUrl}/dashboard/appointments/${id}?payment=cancelled`,
    })

    const sessionResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(creds.secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: lineItems.toString(),
    })

    if (!sessionResp.ok) {
      const errData = await sessionResp.json()
      console.error('[Appointment Pay] Stripe error:', errData)
      return NextResponse.json(
        { error: errData.error?.message || 'Failed to create payment session' },
        { status: 502 }
      )
    }

    const session = await sessionResp.json()

    // Update appointment with pending status
    await db.update(appointments)
      .set({
        paymentStatus: 'pending',
        stripePaymentIntentId: session.payment_intent || null,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
        amount: appointment.price,
        currency: appointment.currency,
      },
    })
  } catch (error) {
    console.error('Failed to initiate payment:', error)
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    )
  }
}

// PATCH /api/appointments/[id]/pay - Mark appointment as paid (webhook or manual confirmation)
export async function PATCH(
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

    const appointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, id),
        eq(appointments.userId, user.userId)
      ),
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const [result] = await db.update(appointments)
      .set({
        isPaid: true,
        paymentStatus: 'paid',
        paidAt: new Date(),
        stripePaymentIntentId: body.paymentIntentId || appointment.stripePaymentIntentId || null,
        // Auto-confirm if pending
        status: appointment.status === 'pending' ? 'confirmed' : appointment.status,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning()

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to mark appointment as paid:', error)
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    )
  }
}
