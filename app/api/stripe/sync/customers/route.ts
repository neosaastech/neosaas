import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/db'
import { companies } from '@/db/schema'
import { isNull, isNotNull, sql } from 'drizzle-orm'
import { syncStripeCustomersFromStripe } from '@/lib/stripe-sync'
import { ensureStripeCustomer } from '@/lib/stripe-customers'

/**
 * GET /api/stripe/sync/customers
 * Returns a comparison between NeoSaaS companies and Stripe customers.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const isAdmin = user?.roles?.some((r: string) => r === 'admin' || r === 'super_admin')
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)

    const [linkedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(isNotNull(companies.stripeCustomerId))

    const [unlinkedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(isNull(companies.stripeCustomerId))

    return NextResponse.json({
      success: true,
      stats: {
        total: totalResult?.count ?? 0,
        linked: linkedResult?.count ?? 0,
        unlinked: unlinkedResult?.count ?? 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

/**
 * POST /api/stripe/sync/customers
 * Body: { direction: 'stripe_to_neosaas' | 'neosaas_to_stripe' | 'both' }
 *
 * stripe_to_neosaas — pull all Stripe customers, link to NeoSaaS companies
 * neosaas_to_stripe — for every unlinked NeoSaaS company, create a Stripe customer
 * both             — run both directions
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const isAdmin = user?.roles?.some((r: string) => r === 'admin' || r === 'super_admin')
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const direction: string = body.direction ?? 'both'

    const results: Record<string, any> = {}

    // Stripe → NeoSaaS: link existing Stripe customers to local companies
    if (direction === 'stripe_to_neosaas' || direction === 'both') {
      const importResult = await syncStripeCustomersFromStripe()
      results.stripeToNeosaas = importResult
    }

    // NeoSaaS → Stripe: create Stripe customers for unlinked companies
    if (direction === 'neosaas_to_stripe' || direction === 'both') {
      const unlinked = await db
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(isNull(companies.stripeCustomerId))

      const pushResults = { created: 0, errors: 0, skipped: 0 }

      for (const company of unlinked) {
        try {
          const { created } = await ensureStripeCustomer(company.id)
          if (created) pushResults.created++
          else pushResults.skipped++
        } catch (err) {
          pushResults.errors++
          console.error(`[Sync Customers] Failed to create Stripe customer for ${company.id}:`, err)
        }
      }

      results.neosaasToStripe = pushResults
    }

    return NextResponse.json({ success: true, direction, results })
  } catch (error: any) {
    console.error('[Sync Customers] Error:', error)
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 })
  }
}
