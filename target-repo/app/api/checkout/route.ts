/**
 * API Route: Checkout
 * POST /api/checkout - Process checkout for cart or appointment booking
 *
 * Supports:
 * - Cart checkout (standard, digital, free products)
 * - Direct appointment booking
 * - Mixed cart with appointments
 *
 * USAGE:
 * - Used by public booking page: /book/[productId]/page.tsx
 * - Dashboard checkout uses server action directly: app/actions/ecommerce.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/server'
import { processCheckout } from '@/app/actions/ecommerce'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Validation schema for checkout request
const appointmentDataSchema = z.object({
  productId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().default('Europe/Paris'),
  attendeeEmail: z.string().email(),
  attendeeName: z.string().min(1),
  attendeePhone: z.string().optional(),
  notes: z.string().optional()
})

const checkoutRequestSchema = z.object({
  cartId: z.string().uuid().optional(),
  appointmentData: appointmentDataSchema.optional()
}).refine(
  data => data.cartId || data.appointmentData,
  { message: 'Either cartId or appointmentData must be provided' }
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

    // Parse and validate request body
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

    const { cartId, appointmentData } = validationResult.data

    // Get user info
    const user = await db.query.users.findFirst({
      where: eq(users.id, authResult.userId),
      with: {
        company: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Process checkout
    const result = await processCheckout({
      cartId,
      appointmentData: appointmentData ? {
        ...appointmentData,
        startTime: new Date(appointmentData.startTime),
        endTime: new Date(appointmentData.endTime)
      } : undefined,
      userId: user.id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      companyId: user.companyId || undefined
    })

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
        appointmentId: result.appointmentId,
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
