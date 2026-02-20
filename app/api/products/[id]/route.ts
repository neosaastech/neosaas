/**
 * API Route: Get Product by ID
 * GET /api/products/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { products } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        vatRate: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: product
    })

  } catch (error) {
    console.error('[API Products] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du produit' },
      { status: 500 }
    )
  }
}
