/**
 * Stripe Synchronization
 * Syncs payment methods, customers and subscriptions between Stripe and local database.
 * Supports bidirectional sync (NeoSaaS ↔ Stripe).
 * Can be run manually or as a scheduled job.
 */

import Stripe from 'stripe'
import { db } from '@/db'
import { companies, paymentMethods, stripeSyncLogs, subscriptions } from '@/db/schema'
import { eq, and, isNotNull, ne } from 'drizzle-orm'
import { getStripeCredentials } from '@/lib/stripe'
import {
  getCompanyPaymentMethodsFromStripe,
  savePaymentMethodToDB,
} from '@/lib/stripe-payment-methods'
import { ensureStripeCustomer, updateStripeCustomerMetadata } from '@/lib/stripe-customers'

/**
 * Helper: get an initialised Stripe client
 */
async function getStripeClient(): Promise<Stripe> {
  const credentials = await getStripeCredentials(false)
  if (!credentials?.secretKey) {
    throw new Error('Stripe credentials not configured. Please add them in Admin > API Management.')
  }
  return new Stripe(credentials.secretKey, { apiVersion: '2024-12-18.acacia', typescript: true })
}

export interface SyncResult {
  companyId: string
  companyName: string
  status: 'success' | 'failed' | 'partial'
  cardsAdded: number
  cardsUpdated: number
  cardsRemoved: number
  duration: number
  customerCreated: boolean
  errorMessage?: string
}

/**
 * Synchronize payment methods for a single company
 */
export async function syncCompanyPaymentMethods(
  companyId: string
): Promise<SyncResult> {
  const startTime = Date.now()
  console.log(`[Stripe Sync] Starting sync for company ${companyId}`)

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId)
  })

  if (!company) {
    throw new Error(`Company ${companyId} not found`)
  }

  const result: SyncResult = {
    companyId,
    companyName: company.name,
    status: 'success',
    cardsAdded: 0,
    cardsUpdated: 0,
    cardsRemoved: 0,
    duration: 0,
    customerCreated: false,
  }

  try {
    // Ensure the company has a Stripe customer, creating one if needed.
    // company.email is used as the canonical reference in Stripe.
    const { customerId, created } = await ensureStripeCustomer(companyId)
    result.customerCreated = created

    // Push company profile (name, email, address, phone, SIRET, writers…) to Stripe.
    // This is idempotent: safe when nothing changed, and essential when the company
    // profile was modified in NeoSaaS or when a customer was just created/re-linked.
    try {
      await updateStripeCustomerMetadata(companyId, true)
      console.log(`[Stripe Sync] Customer profile synced to Stripe for company ${companyId}`)
    } catch (profileErr) {
      console.warn(`[Stripe Sync] Could not push profile to Stripe for company ${companyId}:`, profileErr)
      // Non-blocking — card sync continues even if profile push fails
    }

    // Get payment methods from Stripe for this customer
    const stripePaymentMethods = await getCompanyPaymentMethodsFromStripe(companyId)

    // Get existing payment methods from database
    const dbPaymentMethods = await db.query.paymentMethods.findMany({
      where: eq(paymentMethods.companyId, companyId)
    })

    // Create a map of existing payment methods
    const existingIds = new Set(dbPaymentMethods.map(pm => pm.stripePaymentMethodId))
    const stripeIds = new Set(stripePaymentMethods.map(pm => pm.id))

    // Process each Stripe payment method
    for (const stripeMethod of stripePaymentMethods) {
      const exists = existingIds.has(stripeMethod.id)

      try {
        await savePaymentMethodToDB(stripeMethod, companyId)

        if (exists) {
          result.cardsUpdated++
          console.log(`[Stripe Sync] Updated card ${stripeMethod.id} (${stripeMethod.card?.last4})`)
        } else {
          result.cardsAdded++
          console.log(`[Stripe Sync] Added card ${stripeMethod.id} (${stripeMethod.card?.last4})`)
        }
      } catch (error) {
        console.error(`[Stripe Sync] Error processing payment method ${stripeMethod.id}:`, error)
        result.status = 'partial'
      }
    }

    // Mark removed payment methods as inactive
    for (const dbMethod of dbPaymentMethods) {
      if (!stripeIds.has(dbMethod.stripePaymentMethodId) && dbMethod.isActive) {
        await db
          .update(paymentMethods)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(paymentMethods.id, dbMethod.id))

        result.cardsRemoved++
        console.log(`[Stripe Sync] Removed card ${dbMethod.stripePaymentMethodId} (${dbMethod.cardLast4})`)
      }
    }

    // Sync default payment method from Stripe customer settings
    try {
      const stripe = await getStripeClient()
      const stripeCustomer = await stripe.customers.retrieve(customerId)

      if (stripeCustomer && !stripeCustomer.deleted) {
        const defaultPM = stripeCustomer.invoice_settings?.default_payment_method
        const defaultPMId = defaultPM
          ? (typeof defaultPM === 'string' ? defaultPM : defaultPM.id)
          : null

        if (defaultPMId) {
          // Reset all isDefault flags for this company
          await db
            .update(paymentMethods)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(and(
              eq(paymentMethods.companyId, companyId),
              ne(paymentMethods.stripePaymentMethodId, defaultPMId)
            ))

          // Set the Stripe-designated default
          await db
            .update(paymentMethods)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(and(
              eq(paymentMethods.stripePaymentMethodId, defaultPMId),
              eq(paymentMethods.companyId, companyId)
            ))

          // Persist on company record
          await db
            .update(companies)
            .set({ stripeDefaultPaymentMethod: defaultPMId, updatedAt: new Date() })
            .where(eq(companies.id, companyId))

          console.log(`[Stripe Sync] Default payment method synced: ${defaultPMId}`)
        }
      }
    } catch (defaultSyncError) {
      console.error(`[Stripe Sync] Failed to sync default payment method for company ${companyId}:`, defaultSyncError)
      // Non-blocking: card list sync is still valid even if default sync fails
    }

    result.duration = Date.now() - startTime
    console.log(`[Stripe Sync] Sync completed for company ${companyId}: +${result.cardsAdded} ~${result.cardsUpdated} -${result.cardsRemoved} (${result.duration}ms)`)

  } catch (error) {
    result.status = 'failed'
    result.errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.duration = Date.now() - startTime

    console.error(`[Stripe Sync] Sync failed for company ${companyId}:`, error)
  }

  // Log sync operation
  await logSync(result)

  return result
}

/**
 * Synchronize all companies with Stripe customers
 */
export async function syncAllCompanies(): Promise<SyncResult[]> {
  console.log('[Stripe Sync] Starting sync for all companies')

  // Include all active companies — syncCompanyPaymentMethods will create a
  // Stripe customer (using company.email) for any company that doesn't have one yet.
  const companiesWithStripe = await db.query.companies.findMany({
    where: eq(companies.isActive, true)
  })

  console.log(`[Stripe Sync] Found ${companiesWithStripe.length} active companies to sync`)

  const results: SyncResult[] = []

  for (const company of companiesWithStripe) {
    try {
      const result = await syncCompanyPaymentMethods(company.id)
      results.push(result)
    } catch (error) {
      console.error(`[Stripe Sync] Failed to sync company ${company.id}:`, error)
      results.push({
        companyId: company.id,
        companyName: company.name,
        status: 'failed',
        cardsAdded: 0,
        cardsUpdated: 0,
        cardsRemoved: 0,
        duration: 0,
        customerCreated: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const totalAdded = results.reduce((sum, r) => sum + r.cardsAdded, 0)
  const totalUpdated = results.reduce((sum, r) => sum + r.cardsUpdated, 0)
  const totalRemoved = results.reduce((sum, r) => sum + r.cardsRemoved, 0)
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`[Stripe Sync] All companies synced: +${totalAdded} ~${totalUpdated} -${totalRemoved} (${totalDuration}ms total)`)

  return results
}

/**
 * Log sync operation to database
 */
async function logSync(result: SyncResult): Promise<void> {
  try {
    await db.insert(stripeSyncLogs).values({
      companyId: result.companyId,
      syncType: 'cards',
      status: result.status,
      cardsAdded: result.cardsAdded,
      cardsUpdated: result.cardsUpdated,
      cardsRemoved: result.cardsRemoved,
      errorMessage: result.errorMessage || null,
      metadata: {
        companyName: result.companyName,
      },
      duration: result.duration,
    })
  } catch (error) {
    console.error('[Stripe Sync] Failed to log sync operation:', error)
  }
}

/**
 * Get recent sync logs for a company
 */
export async function getCompanySyncLogs(
  companyId: string,
  limit = 10
): Promise<typeof stripeSyncLogs.$inferSelect[]> {
  const logs = await db.query.stripeSyncLogs.findMany({
    where: eq(stripeSyncLogs.companyId, companyId),
    orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    limit,
  })

  return logs
}

/**
 * Get all recent sync logs
 */
export async function getAllSyncLogs(
  limit = 50
): Promise<typeof stripeSyncLogs.$inferSelect[]> {
  const logs = await db.query.stripeSyncLogs.findMany({
    orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    limit,
  })

  return logs
}

// =============================================================================
// BIDIRECTIONAL SYNC — Stripe → NeoSaaS
// =============================================================================

export interface CustomerSyncResult {
  matched: number
  updated: number
  notFound: number
  errors: number
  details: Array<{
    stripeId: string
    email: string
    status: 'matched' | 'updated' | 'not_found' | 'error'
    message: string
  }>
}

/**
 * Sync Stripe customers → NeoSaaS companies
 *
 * Fetches every customer from Stripe and tries to link it to a local company.
 * Matching strategy (in order):
 *   1. metadata.neosaas_company_id
 *   2. customer email == company.email
 *
 * For companies not yet in Stripe, call ensureStripeCustomer() instead
 * (handled by the POST /api/stripe/sync/customers endpoint).
 */
export async function syncStripeCustomersFromStripe(): Promise<CustomerSyncResult> {
  console.log('[Stripe Sync] Starting customer sync from Stripe')

  const stripe = await getStripeClient()
  const result: CustomerSyncResult = { matched: 0, updated: 0, notFound: 0, errors: 0, details: [] }

  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.customers.list({ limit: 100, starting_after: startingAfter })

    for (const customer of page.data) {
      try {
        const metaCompanyId = customer.metadata?.neosaas_company_id
        const email = customer.email

        let company: typeof companies.$inferSelect | undefined

        // 1. Try metadata match
        if (metaCompanyId) {
          const rows = await db
            .select()
            .from(companies)
            .where(eq(companies.id, metaCompanyId))
            .limit(1)
          company = rows[0]
        }

        // 2. Fallback: email match
        if (!company && email) {
          const rows = await db
            .select()
            .from(companies)
            .where(eq(companies.email, email))
            .limit(1)
          company = rows[0]
        }

        if (!company) {
          result.notFound++
          result.details.push({
            stripeId: customer.id,
            email: email || '',
            status: 'not_found',
            message: 'No matching NeoSaaS company',
          })
          continue
        }

        if (company.stripeCustomerId === customer.id) {
          result.matched++
          result.details.push({
            stripeId: customer.id,
            email: email || '',
            status: 'matched',
            message: `Already linked to "${company.name}"`,
          })
          continue
        }

        // Link / update the company record
        await db
          .update(companies)
          .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
          .where(eq(companies.id, company.id))

        result.updated++
        result.details.push({
          stripeId: customer.id,
          email: email || '',
          status: 'updated',
          message: `Linked to "${company.name}"`,
        })
      } catch (err) {
        result.errors++
        result.details.push({
          stripeId: customer.id,
          email: customer.email || '',
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
        console.error(`[Stripe Sync] Customer ${customer.id} error:`, err)
      }
    }

    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id
    }
  }

  console.log(
    `[Stripe Sync] Customer sync done: matched=${result.matched} updated=${result.updated} notFound=${result.notFound} errors=${result.errors}`
  )
  return result
}

export interface SubscriptionSyncResult {
  created: number
  updated: number
  skipped: number
  errors: number
  total: number
}

/**
 * Sync Stripe subscriptions → NeoSaaS subscriptions table
 *
 * Fetches every active/non-deleted subscription from Stripe and
 * creates or updates the corresponding row in the local subscriptions table.
 * Matching is done via company.stripeCustomerId == subscription.customer.
 */
export async function syncStripeSubscriptionsFromStripe(): Promise<SubscriptionSyncResult> {
  console.log('[Stripe Sync] Starting subscription sync from Stripe')

  const stripe = await getStripeClient()
  const result: SubscriptionSyncResult = { created: 0, updated: 0, skipped: 0, errors: 0, total: 0 }

  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.subscriptions.list({
      limit: 100,
      starting_after: startingAfter,
      status: 'all',
    })

    for (const sub of page.data) {
      result.total++
      try {
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : (sub.customer as Stripe.Customer).id

        // Find the NeoSaaS company for this Stripe customer
        const companyRows = await db
          .select({ id: companies.id })
          .from(companies)
          .where(eq(companies.stripeCustomerId, customerId))
          .limit(1)

        if (!companyRows[0]) {
          result.skipped++
          continue
        }

        const companyId = companyRows[0].id
        const priceId = sub.items.data[0]?.price?.id ?? ''

        // Check for existing local record
        const existingRows = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, sub.id))
          .limit(1)

        const periodStart = sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : null
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null

        if (existingRows[0]) {
          await db
            .update(subscriptions)
            .set({
              status: sub.status,
              stripePriceId: priceId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.stripeSubscriptionId, sub.id))
          result.updated++
        } else {
          await db.insert(subscriptions).values({
            stripeSubscriptionId: sub.id,
            customerId: companyId,
            stripePriceId: priceId,
            status: sub.status,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          })
          result.created++
        }
      } catch (err) {
        result.errors++
        console.error(`[Stripe Sync] Subscription ${sub.id} error:`, err)
      }
    }

    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id
    }
  }

  console.log(
    `[Stripe Sync] Subscription sync done: created=${result.created} updated=${result.updated} skipped=${result.skipped} errors=${result.errors}`
  )
  return result
}

/**
 * Get sync statistics
 */
export async function getSyncStatistics(): Promise<{
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  totalCardsAdded: number
  totalCardsUpdated: number
  totalCardsRemoved: number
  averageDuration: number
}> {
  const logs = await db.query.stripeSyncLogs.findMany({
    orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    limit: 100,
  })

  return {
    totalSyncs: logs.length,
    successfulSyncs: logs.filter(l => l.status === 'success').length,
    failedSyncs: logs.filter(l => l.status === 'failed').length,
    totalCardsAdded: logs.reduce((sum, l) => sum + (l.cardsAdded || 0), 0),
    totalCardsUpdated: logs.reduce((sum, l) => sum + (l.cardsUpdated || 0), 0),
    totalCardsRemoved: logs.reduce((sum, l) => sum + (l.cardsRemoved || 0), 0),
    averageDuration: logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length || 0,
  }
}
