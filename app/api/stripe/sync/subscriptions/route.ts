import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/db'
import { subscriptions, companies } from '@/db/schema'
import { sql, isNotNull } from 'drizzle-orm'
import { syncStripeSubscriptionsFromStripe } from '@/lib/stripe-sync'

/**
 * GET /api/stripe/sync/subscriptions
 * Returns a comparison between local subscriptions and Stripe.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const isAdmin = user?.roles?.some((r: string) => r === 'admin' || r === 'super_admin')
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalSubs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)

    const [activeSubs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(sql`${subscriptions.status} = 'active'`)

    const [linkedCompanies] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(isNotNull(companies.stripeCustomerId))

    return NextResponse.json({
      success: true,
      stats: {
        localSubscriptions: totalSubs?.count ?? 0,
        activeSubscriptions: activeSubs?.count ?? 0,
        companiesLinkedToStripe: linkedCompanies?.count ?? 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

/**
 * POST /api/stripe/sync/subscriptions
 * Pulls all subscriptions from Stripe and creates/updates local records.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const isAdmin = user?.roles?.some((r: string) => r === 'admin' || r === 'super_admin')
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await syncStripeSubscriptionsFromStripe()

    return NextResponse.json({
      success: true,
      message: `Synced ${result.total} subscriptions: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`,
      data: result,
    })
  } catch (error: any) {
    console.error('[Sync Subscriptions] Error:', error)
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 })
  }
}
