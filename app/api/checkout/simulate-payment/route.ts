/**
 * API Route: Simulate Payment (Test Mode Only)
 * POST /api/checkout/simulate-payment
 *
 * Simulates a payment for testing purposes when in test mode.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/server'
import { shouldUseTestMode, simulateTestPayment } from '@/lib/checkout'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq } from 'drizzle-orm'

const requestSchema = z.object({
  orderId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth()
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

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

    const { orderId } = validationResult.data

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

    const invoiceId = `simulated_pi_${Date.now()}`
    const payment = await simulateTestPayment(invoiceId)

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

  } catch (error) {
    console.error('[API Simulate Payment] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la simulation de paiement' },
      { status: 500 }
    )
  }
}
