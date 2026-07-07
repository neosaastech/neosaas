/**
 * API Route: Simulate Payment (Test Mode Only)
 * POST /api/checkout/simulate-payment
 *
 * Simulates a payment for testing purposes when Lago is in test mode
 * or not connected to a payment provider.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/server'
import { shouldUseTestMode, simulateTestPayment } from '@/lib/checkout'
import { db } from '@/db'
import { appointments, orders } from '@/db/schema'
import { eq } from 'drizzle-orm'

const requestSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional()
}).refine(
  data => data.appointmentId || data.orderId,
  { message: 'Either appointmentId or orderId must be provided' }
)

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth()
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Check if test mode is enabled
    const testModeEnabled = await shouldUseTestMode()
    if (!testModeEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Simulation de paiement disponible uniquement en mode test'
        },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = requestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: validationResult.error.flatten()
        },
        { status: 400 }
      )
    }

    const { appointmentId, orderId } = validationResult.data

    // Simulate payment for appointment
    if (appointmentId) {
      const appointment = await db.query.appointments.findFirst({
        where: eq(appointments.id, appointmentId)
      })

      if (!appointment) {
        return NextResponse.json(
          { success: false, error: 'Rendez-vous non trouvé' },
          { status: 404 }
        )
      }

      if (appointment.paymentStatus === 'paid') {
        return NextResponse.json(
          { success: false, error: 'Rendez-vous déjà payé' },
          { status: 400 }
        )
      }

      // Simulate the payment
      const invoiceId = `test_appt_${Date.now()}`
      const payment = await simulateTestPayment(invoiceId)

      // Update appointment status
      await db.update(appointments)
        .set({
          paymentStatus: 'paid',
          status: 'confirmed',
          updatedAt: new Date()
        })
        .where(eq(appointments.id, appointmentId))

      return NextResponse.json({
        success: true,
        data: {
          appointmentId,
          transactionId: payment.transactionId,
          paidAt: payment.paidAt,
          status: 'paid',
          testMode: true
        }
      })
    }

    // Simulate payment for order
    if (orderId) {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      })

      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Commande non trouvée' },
          { status: 404 }
        )
      }

      if (order.paymentStatus === 'paid') {
        return NextResponse.json(
          { success: false, error: 'Commande déjà payée' },
          { status: 400 }
        )
      }

      // Simulate the payment
      const invoiceId = `simulated_pi_${Date.now()}`
      const payment = await simulateTestPayment(invoiceId)

      // Update order status
      await db.update(orders)
        .set({
          paymentStatus: 'paid',
          status: 'completed',
          paidAt: payment.paidAt,
          paymentIntentId: payment.transactionId,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))

      return NextResponse.json({
        success: true,
        data: {
          orderId,
          transactionId: payment.transactionId,
          paidAt: payment.paidAt,
          status: 'paid',
          testMode: true
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Aucune action effectuée' },
      { status: 400 }
    )

  } catch (error) {
    console.error('[API Simulate Payment] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la simulation de paiement' },
      { status: 500 }
    )
  }
}
