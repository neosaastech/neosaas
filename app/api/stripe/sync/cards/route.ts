import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { companies, paymentMethods } from '@/db/schema'
import { eq, and, isNotNull, count } from 'drizzle-orm'
import { syncCompanyPaymentMethods, syncAllCompanies } from '@/lib/stripe-sync'

/**
 * GET /api/stripe/sync/cards
 *
 * Returns the card sync status for a given company (or all companies).
 *
 * Query params:
 *   companyId  — UUID of the company (optional; omit for aggregated stats)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (companyId) {
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        columns: {
          id: true,
          name: true,
          stripeCustomerId: true,
          stripeDefaultPaymentMethod: true,
        },
      })

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      const cards = await db.query.paymentMethods.findMany({
        where: and(
          eq(paymentMethods.companyId, companyId),
          eq(paymentMethods.isActive, true)
        ),
        columns: {
          id: true,
          stripePaymentMethodId: true,
          cardBrand: true,
          cardLast4: true,
          cardExpMonth: true,
          cardExpYear: true,
          isDefault: true,
          lastSyncedAt: true,
        },
        orderBy: (pm, { desc }) => [desc(pm.isDefault), desc(pm.createdAt)],
      })

      return NextResponse.json({
        companyId: company.id,
        companyName: company.name,
        hasStripeCustomer: !!company.stripeCustomerId,
        stripeCustomerId: company.stripeCustomerId ?? null,
        defaultPaymentMethodId: company.stripeDefaultPaymentMethod ?? null,
        totalCards: cards.length,
        cards,
      })
    }

    // Aggregated stats across all companies
    const [{ value: totalCompanies }] = await db
      .select({ value: count() })
      .from(companies)
      .where(eq(companies.isActive, true))

    const [{ value: linkedCompanies }] = await db
      .select({ value: count() })
      .from(companies)
      .where(and(eq(companies.isActive, true), isNotNull(companies.stripeCustomerId)))

    const [{ value: totalCards }] = await db
      .select({ value: count() })
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))

    const [{ value: companiesWithDefault }] = await db
      .select({ value: count() })
      .from(companies)
      .where(and(
        eq(companies.isActive, true),
        isNotNull(companies.stripeDefaultPaymentMethod)
      ))

    return NextResponse.json({
      stats: {
        totalCompanies,
        linkedCompanies,
        totalActiveCards: totalCards,
        companiesWithDefaultCard: companiesWithDefault,
      },
    })
  } catch (error) {
    console.error('[API /stripe/sync/cards] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stripe/sync/cards
 *
 * Triggers a card synchronisation from Stripe for one company or all companies.
 *
 * Body:
 *   { companyId: string }  — sync a single company
 *   { all: true }          — sync every company that has a Stripe customer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      companyId?: string
      all?: boolean
    }

    if (body.all) {
      const results = await syncAllCompanies()

      const summary = {
        total: results.length,
        success: results.filter(r => r.status === 'success').length,
        partial: results.filter(r => r.status === 'partial').length,
        failed: results.filter(r => r.status === 'failed').length,
        totalCardsAdded: results.reduce((s, r) => s + r.cardsAdded, 0),
        totalCardsUpdated: results.reduce((s, r) => s + r.cardsUpdated, 0),
        totalCardsRemoved: results.reduce((s, r) => s + r.cardsRemoved, 0),
      }

      return NextResponse.json({ success: true, summary, results })
    }

    if (body.companyId) {
      const result = await syncCompanyPaymentMethods(body.companyId)
      return NextResponse.json({
        success: result.status !== 'failed',
        result,
      })
    }

    return NextResponse.json(
      { error: 'Provide companyId or all=true' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API /stripe/sync/cards] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
