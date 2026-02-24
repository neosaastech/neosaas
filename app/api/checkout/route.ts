/**
 * API Route: Checkout
 * POST /api/checkout - Process checkout for cart
 *
 * Dashboard checkout uses server action directly: app/actions/ecommerce.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/server'
import { processCheckout } from '@/app/actions/ecommerce'

const checkoutRequestSchema = z.object({
  cartId: z.string().uuid(),
  couponCode: z.string().optional()
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

    const body = await request.json()
    const validationResult = checkoutRequestSchema.safeParse(body)

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

    const { cartId, couponCode } = validationResult.data
    const result = await processCheckout(cartId, couponCode)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.orderId,
        invoiceId: result.invoiceId,
        requiresPayment: result.requiresPayment,
        testMode: result.testMode
      }
    })

  } catch (error) {
    console.error('[API Checkout] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du checkout' },
      { status: 500 }
    )
  }
}
