import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/db'
import { companies } from '@/db/schema'
import { desc, isNotNull, sql, or, ilike } from 'drizzle-orm'

/**
 * GET /api/admin/payments/stripe-customers
 *
 * Returns companies with their Stripe customer IDs.
 * Query params:
 *   - search: (optional) filter by company name or email
 *   - linked: (optional) "true" = only with stripeCustomerId, "false" = only without
 */
export async function GET(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────
    const user = await getCurrentUser()
    const isAdmin = user?.roles?.some(
      (r: string) => r === 'admin' || r === 'super_admin'
    )
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Query params ────────────────────────────────────
    const search = request.nextUrl.searchParams.get('search')?.trim() || ''
    const linked = request.nextUrl.searchParams.get('linked')

    // ── Build conditions ────────────────────────────────
    const conditions = []

    if (search) {
      conditions.push(
        or(
          ilike(companies.name, `%${search}%`),
          ilike(companies.email, `%${search}%`),
          ilike(companies.siret, `%${search}%`)
        )
      )
    }

    if (linked === 'true') {
      conditions.push(isNotNull(companies.stripeCustomerId))
    } else if (linked === 'false') {
      conditions.push(sql`${companies.stripeCustomerId} IS NULL`)
    }

    // ── Query ───────────────────────────────────────────
    let query = db
      .select({
        id: companies.id,
        name: companies.name,
        email: companies.email,
        siret: companies.siret,
        phone: companies.phone,
        stripeCustomerId: companies.stripeCustomerId,
        isActive: companies.isActive,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .orderBy(desc(companies.createdAt))
      .limit(50)

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0]! : sql`${conditions[0]} AND ${conditions[1]}`) as typeof query
    }

    const results = await query

    // Serialize dates
    const safeResults = results.map(c => ({
      ...c,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt ? String(c.createdAt) : null,
    }))

    // Stats
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)

    const [linkedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(isNotNull(companies.stripeCustomerId))

    return NextResponse.json({
      companies: safeResults,
      stats: {
        total: totalResult?.count ?? 0,
        linked: linkedResult?.count ?? 0,
        unlinked: (totalResult?.count ?? 0) - (linkedResult?.count ?? 0),
      },
    })
  } catch (error: any) {
    console.error('[stripe-customers] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}
