import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth/admin-auth'
import { db } from '@/db'
import { companies, paymentMethods } from '@/db/schema'
import { eq, or } from 'drizzle-orm'
import { syncCompanyPaymentMethods } from '@/lib/stripe-sync'

/**
 * POST /api/admin/stripe/reset-customer
 *
 * Délie un client Stripe d'une entreprise (efface stripeCustomerId) et
 * supprime les enregistrements locaux de moyens de paiement associés.
 * Un nouveau client Stripe sera créé automatiquement au prochain sync
 * (company.email utilisé comme référence canonique).
 *
 * Cas d'usage :
 *   - Ancien compte Stripe lié par erreur
 *   - Client Stripe supprimé dans Stripe mais toujours en base
 *   - Migration vers un nouveau compte Stripe
 *
 * Body (au moins un des deux) :
 *   { companyId: string }         → reset par ID d'entreprise
 *   { stripeCustomerId: string }  → reset par ID client Stripe (ex: cus_Mg5oAI6FjhGfmi)
 *
 * Options :
 *   { syncAfter?: boolean }       → lancer une sync après le reset (défaut: false)
 *   { dryRun?: boolean }          → simuler sans modifier (défaut: false)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json() as {
      companyId?: string
      stripeCustomerId?: string
      syncAfter?: boolean
      dryRun?: boolean
    }

    const { companyId, stripeCustomerId, syncAfter = false, dryRun = false } = body

    if (!companyId && !stripeCustomerId) {
      return NextResponse.json(
        { error: 'Provide companyId or stripeCustomerId' },
        { status: 400 }
      )
    }

    // ── Trouver la/les entreprise(s) concernée(s) ──────────────────────────
    const targets = await db.query.companies.findMany({
      where: companyId
        ? eq(companies.id, companyId)
        : eq(companies.stripeCustomerId, stripeCustomerId!),
      columns: {
        id: true,
        name: true,
        email: true,
        stripeCustomerId: true,
        stripeDefaultPaymentMethod: true,
      },
    })

    if (targets.length === 0) {
      return NextResponse.json(
        {
          error: 'Company not found',
          hint: companyId
            ? `No company with id="${companyId}"`
            : `No company linked to stripeCustomerId="${stripeCustomerId}"`,
        },
        { status: 404 }
      )
    }

    const results = []

    for (const company of targets) {
      // Compter les moyens de paiement locaux
      const cards = await db.query.paymentMethods.findMany({
        where: eq(paymentMethods.companyId, company.id),
        columns: { id: true, stripePaymentMethodId: true, cardBrand: true, cardLast4: true },
      })

      if (dryRun) {
        results.push({
          companyId: company.id,
          companyName: company.name,
          companyEmail: company.email,
          oldStripeCustomerId: company.stripeCustomerId,
          cardsToDelete: cards.length,
          dryRun: true,
        })
        continue
      }

      // 1. Supprimer les enregistrements locaux de moyens de paiement
      if (cards.length > 0) {
        await db
          .delete(paymentMethods)
          .where(eq(paymentMethods.companyId, company.id))
      }

      // 2. Effacer le mapping Stripe
      await db
        .update(companies)
        .set({
          stripeCustomerId: null,
          stripeDefaultPaymentMethod: null,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, company.id))

      // 3. Sync optionnel (crée le nouveau client Stripe avec company.email)
      let syncResult = null
      if (syncAfter) {
        syncResult = await syncCompanyPaymentMethods(company.id)
      }

      results.push({
        companyId: company.id,
        companyName: company.name,
        companyEmail: company.email,
        oldStripeCustomerId: company.stripeCustomerId,
        cardsDeleted: cards.length,
        newStripeCustomerId: syncResult
          ? (await db.query.companies.findFirst({
              where: eq(companies.id, company.id),
              columns: { stripeCustomerId: true },
            }))?.stripeCustomerId ?? null
          : null,
        syncResult,
      })
    }

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun
        ? 'Simulation terminée — aucune modification appliquée.'
        : `${targets.length} entreprise(s) réinitialisée(s). ${syncAfter ? 'Nouveau(x) client(s) Stripe créé(s).' : 'Lancez une sync pour créer le(s) nouveau(x) client(s) Stripe.'}`,
      results,
    })
  } catch (error) {
    console.error('[Admin] reset-customer error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/stripe/reset-customer?stripeCustomerId=cus_xxx
 *               ou ?companyId=uuid
 *
 * Diagnostic : affiche l'entreprise liée à un customer ID Stripe
 * sans modifier quoi que ce soit.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const stripeCustomerId = searchParams.get('stripeCustomerId')

    if (!companyId && !stripeCustomerId) {
      return NextResponse.json(
        { error: 'Provide companyId or stripeCustomerId as query param' },
        { status: 400 }
      )
    }

    const company = await db.query.companies.findFirst({
      where: companyId
        ? eq(companies.id, companyId)
        : eq(companies.stripeCustomerId, stripeCustomerId!),
      columns: {
        id: true,
        name: true,
        email: true,
        stripeCustomerId: true,
        stripeDefaultPaymentMethod: true,
        isActive: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const cards = await db.query.paymentMethods.findMany({
      where: eq(paymentMethods.companyId, company.id),
      columns: {
        id: true,
        stripePaymentMethodId: true,
        cardBrand: true,
        cardLast4: true,
        isDefault: true,
        isActive: true,
        lastSyncedAt: true,
      },
    })

    return NextResponse.json({ company, cards })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
