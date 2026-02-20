/**
 * POST /api/admin/stripe/sync-products
 * ======================================
 * Syncs all NeoSaaS products (or a specific one) to Stripe.
 * Replaces the manual `pnpm tsx scripts/seed-stripe-products.ts` script.
 *
 * Body (JSON):
 *   {}                        — sync all products
 *   { productId: "uuid" }     — sync a single product
 *
 * GET /api/admin/stripe/sync-products
 *   Returns sync status for all products (which ones have stripeProductId set).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { syncProductToStripe } from '@/lib/stripe-products'
import { db } from '@/db'
import { products } from '@/db/schema'

// ─── GET — list products + their Stripe sync status ──────────────────────────

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  const isAdmin = user?.roles?.some((r: string) => r === 'admin' || r === 'super_admin')
  if (!user || !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const allProducts = await db.select({
      id: products.id,
      title: products.title,
      price: products.price,
      paymentType: products.paymentType,
      isFree: products.isFree,
      stripeProductId: products.stripeProductId,
      stripePriceOneTime: products.stripePriceOneTime,
      stripePriceWeekly: products.stripePriceWeekly,
      stripePriceMonthly: products.stripePriceMonthly,
      stripePriceYearly: products.stripePriceYearly,
    }).from(products)

    const summary = allProducts.map((p) => {
      const isOneTime = p.paymentType === 'one_time' || !p.paymentType
      const isSubscription = p.paymentType === 'subscription'
      // A one_time product is fully synced only if it has both stripeProductId AND stripePriceOneTime
      // (unless it's free or has no price)
      const needsPrice = !p.isFree && (p.price ?? 0) > 0
      const priceSynced = isOneTime
        ? !needsPrice || Boolean(p.stripePriceOneTime)
        : isSubscription
          ? Boolean(p.stripePriceMonthly || p.stripePriceWeekly || p.stripePriceYearly)
          : true // hourly products don't need a Price
      const synced = Boolean(p.stripeProductId) && priceSynced
      return {
        ...p,
        synced,
        priceSynced,
        syncNote: !p.stripeProductId
          ? 'missing_stripe_product'
          : !priceSynced
            ? isOneTime
              ? 'missing_one_time_price'
              : 'missing_subscription_prices'
            : 'ok',
      }
    })

    return NextResponse.json({
      success: true,
      total: summary.length,
      synced: summary.filter((p) => p.synced).length,
      unsynced: summary.filter((p) => !p.synced).length,
      products: summary,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// ─── POST — trigger sync ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  const isAdmin = user?.roles?.some((r: string) => r === 'admin' || r === 'super_admin')
  if (!user || !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const singleProductId: string | undefined = body.productId

    if (singleProductId) {
      // Sync a single product
      const result = await syncProductToStripe(singleProductId)
      return NextResponse.json({
        success: result.success,
        results: [{ productId: singleProductId, ...result }],
      })
    }

    // Sync all products
    const allProducts = await db.select({ id: products.id, title: products.title }).from(products)

    const results = []
    for (const product of allProducts) {
      const result = await syncProductToStripe(product.id)
      results.push({ productId: product.id, title: product.title, ...result })
    }

    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      total: results.length,
      succeeded,
      failed,
      results,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
