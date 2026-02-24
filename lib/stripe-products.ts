/**
 * Stripe Products Sync
 * ====================
 * Syncs NeoSaaS products to Stripe automatically when they are created or updated.
 * Also handles webhook endpoint registration so the app configures itself on Stripe.
 *
 * Functions:
 * - syncProductToStripe(productId)  — create or update Stripe Product + Prices, store IDs in DB
 * - registerStripeWebhook(appUrl)   — register /api/stripe/webhook on Stripe, save whsec_ to DB
 */

import { db } from '@/db'
import { products } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getStripeCredentials } from '@/lib/stripe'
import { serviceApiRepository } from '@/lib/services'

// ─── Stripe HTTP helper ───────────────────────────────────────────────────────

async function stripeFetch(
  secretKey: string,
  endpoint: string,
  params?: Record<string, string>,
  method: 'GET' | 'POST' | 'DELETE' = 'GET'
) {
  const auth = `Basic ${Buffer.from(secretKey + ':').toString('base64')}`
  const url =
    method === 'GET' && params
      ? `https://api.stripe.com/v1${endpoint}?${new URLSearchParams(params)}`
      : `https://api.stripe.com/v1${endpoint}`

  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body:
      method === 'POST' && params
        ? new URLSearchParams(params).toString()
        : undefined,
  })

  const data = await resp.json()
  if (!resp.ok) {
    throw new Error(
      `Stripe ${method} ${endpoint} → ${resp.status}: ${data.error?.message}`
    )
  }
  return data
}

// ─── Intervals ────────────────────────────────────────────────────────────────

type Interval = 'weekly' | 'monthly' | 'yearly'

const INTERVALS: {
  key: Interval
  priceField: 'subscriptionPriceWeekly' | 'subscriptionPriceMonthly' | 'subscriptionPriceYearly'
  stripePriceField: 'stripePriceWeekly' | 'stripePriceMonthly' | 'stripePriceYearly'
  stripeInterval: string
  stripeIntervalCount: number
}[] = [
  {
    key: 'weekly',
    priceField: 'subscriptionPriceWeekly',
    stripePriceField: 'stripePriceWeekly',
    stripeInterval: 'week',
    stripeIntervalCount: 1,
  },
  {
    key: 'monthly',
    priceField: 'subscriptionPriceMonthly',
    stripePriceField: 'stripePriceMonthly',
    stripeInterval: 'month',
    stripeIntervalCount: 1,
  },
  {
    key: 'yearly',
    priceField: 'subscriptionPriceYearly',
    stripePriceField: 'stripePriceYearly',
    stripeInterval: 'year',
    stripeIntervalCount: 1,
  },
]

// ─── Webhook events we want Stripe to send ───────────────────────────────────

const WEBHOOK_EVENTS = [
  'payment_method.attached',
  'payment_method.detached',
  'payment_method.updated',
  'customer.updated',
  'customer.deleted',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]

// ─── syncProductToStripe ──────────────────────────────────────────────────────

export interface ProductSyncResult {
  success: boolean
  stripeProductId?: string
  pricesCreated: string[]
  pricesSkipped: string[]
  pricesArchived: string[]
  error?: string
}

/**
 * Sync a NeoSaaS product to Stripe.
 * - Creates (or finds existing) Stripe Product using metadata[neosaas_product_id]
 * - For one-time products: creates/updates a one-time Price (archives old one if amount changed)
 * - For subscription products: creates missing recurring Prices for each configured interval
 * - Stores Stripe IDs back in the products table
 * - Skips free products (isFree=true or price=0 for one-time)
 *
 * This is idempotent: calling it multiple times is safe.
 */
export async function syncProductToStripe(productId: string): Promise<ProductSyncResult> {
  const result: ProductSyncResult = { success: false, pricesCreated: [], pricesSkipped: [], pricesArchived: [] }

  try {
    const creds = await getStripeCredentials(false)
    if (!creds?.secretKey) {
      result.error = 'Stripe credentials not configured'
      return result
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    })

    if (!product) {
      result.error = `Product ${productId} not found`
      return result
    }

    // Skip free products — no Stripe Product needed
    if (product.isFree) {
      result.success = true
      result.pricesSkipped.push('free_product')
      console.log(`[stripe-products] Skipping free product "${product.title}" (isFree=true)`)
      return result
    }

    const isSubscription = product.paymentType === 'subscription'
    const isOneTime = product.paymentType === 'one_time' || !product.paymentType
    const isHourly = product.paymentType === 'hourly'

    // Hourly products: only create Stripe Product (no Price — billed later)
    // One-time products: create Stripe Product + one-time Price
    // Subscription products: create Stripe Product + recurring Prices

    // Skip if one-time with 0 price
    if (isOneTime && (!product.price || product.price <= 0)) {
      result.success = true
      result.pricesSkipped.push('zero_price')
      console.log(`[stripe-products] Skipping zero-price product "${product.title}"`)
      return result
    }

    // Step 1: Find or create Stripe Product
    let stripeProductId = product.stripeProductId ?? null

    if (!stripeProductId) {
      // Search by metadata
      const search = await stripeFetch(creds.secretKey, '/products/search', {
        query: `metadata["neosaas_product_id"]:"${product.id}"`,
      })

      if (search.data?.length > 0) {
        stripeProductId = search.data[0].id
      } else {
        const params: Record<string, string> = {
          name: product.title,
          'metadata[neosaas_product_id]': product.id,
          'metadata[source]': 'neosaas',
          'metadata[type]': product.type || 'physical',
          'metadata[payment_type]': product.paymentType ?? 'one_time',
        }
        if (product.description) {
          params.description = product.description.substring(0, 500)
        }
        const created = await stripeFetch(creds.secretKey, '/products', params, 'POST')
        stripeProductId = created.id
      }

      // Persist the Stripe Product ID immediately
      await db.update(products)
        .set({ stripeProductId })
        .where(eq(products.id, productId))
    } else {
      // Update existing Stripe Product name/description/metadata in case it changed
      const params: Record<string, string> = {
        name: product.title,
        'metadata[type]': product.type || 'physical',
        'metadata[payment_type]': product.paymentType ?? 'one_time',
      }
      if (product.description) {
        params.description = product.description.substring(0, 500)
      }
      await stripeFetch(creds.secretKey, `/products/${stripeProductId}`, params, 'POST')
    }

    result.stripeProductId = stripeProductId

    // Step 2a: For ONE-TIME products, sync a one-time Price
    if (isOneTime && product.price > 0) {
      const currency = (product.currency || 'EUR').toLowerCase()
      const existingPriceId = product.stripePriceOneTime ?? null

      let needNewPrice = !existingPriceId

      // Check if existing price matches current amount (Stripe Prices are immutable)
      if (existingPriceId) {
        try {
          const existingPrice = await stripeFetch(creds.secretKey, `/prices/${existingPriceId}`)
          if (existingPrice.unit_amount !== product.price || existingPrice.currency !== currency) {
            // Price changed — archive the old one and create a new one
            await stripeFetch(creds.secretKey, `/prices/${existingPriceId}`, { active: 'false' }, 'POST')
            result.pricesArchived.push(`one_time:${existingPriceId}`)
            needNewPrice = true
          } else {
            result.pricesSkipped.push('one_time')
          }
        } catch {
          // Price not found on Stripe — create a new one
          needNewPrice = true
        }
      }

      if (needNewPrice) {
        // Idempotency: search Stripe for an existing matching one-time price
        // (mirrors the subscription path to avoid duplicate Prices on re-sync)
        const existingPrices = await stripeFetch(creds.secretKey, '/prices', {
          product: stripeProductId!,
          active: 'true',
          type: 'one_time',
          limit: '20',
        })

        const found = (existingPrices.data ?? []).find(
          (p: any) =>
            p.unit_amount === product.price &&
            p.currency === currency &&
            !p.recurring
        )

        let priceId: string
        if (found) {
          // Re-use the existing Stripe Price instead of creating a duplicate
          priceId = found.id
          console.log(`[stripe-products] ♻️  Reusing existing one-time price ${priceId} for "${product.title}"`)
        } else {
          const priceParams: Record<string, string> = {
            product: stripeProductId!,
            unit_amount: String(product.price),
            currency,
            'metadata[neosaas_product_id]': product.id,
            'metadata[price_type]': 'one_time',
          }
          const created = await stripeFetch(creds.secretKey, '/prices', priceParams, 'POST')
          priceId = created.id
        }

        await db.update(products)
          .set({ stripePriceOneTime: priceId })
          .where(eq(products.id, productId))

        result.pricesCreated.push(`one_time:${priceId}`)
      }
    }

    // Step 2b: For SUBSCRIPTION products, sync Prices for each interval
    if (isSubscription) {
      const dbUpdate: Partial<Record<string, string | null>> = {}
      const currency = (product.currency || 'EUR').toLowerCase()

      for (const interval of INTERVALS) {
        const amountCents = product[interval.priceField] as number | null
        if (!amountCents || amountCents <= 0) {
          result.pricesSkipped.push(interval.key)
          continue
        }

        const existingPriceId = product[interval.stripePriceField] as string | null

        let needNewPrice = !existingPriceId

        // Check if existing price still matches
        if (existingPriceId) {
          try {
            const existingPrice = await stripeFetch(creds.secretKey, `/prices/${existingPriceId}`)
            if (existingPrice.unit_amount !== amountCents || existingPrice.currency !== currency) {
              // Price changed — archive old, create new
              await stripeFetch(creds.secretKey, `/prices/${existingPriceId}`, { active: 'false' }, 'POST')
              result.pricesArchived.push(`${interval.key}:${existingPriceId}`)
              needNewPrice = true
            } else {
              result.pricesSkipped.push(interval.key)
            }
          } catch {
            needNewPrice = true
          }
        }

        if (needNewPrice) {
          // Also check for a matching price already on Stripe (idempotency)
          const existingPrices = await stripeFetch(creds.secretKey, '/prices', {
            product: stripeProductId!,
            active: 'true',
            limit: '20',
          })

          const found = (existingPrices.data ?? []).find(
            (p: any) =>
              p.recurring?.interval === interval.stripeInterval &&
              p.recurring?.interval_count === interval.stripeIntervalCount &&
              p.unit_amount === amountCents &&
              p.currency === currency
          )

          let priceId: string
          if (found) {
            priceId = found.id
          } else {
            const priceParams: Record<string, string> = {
              product: stripeProductId!,
              unit_amount: String(amountCents),
              currency,
              'recurring[interval]': interval.stripeInterval,
              'recurring[interval_count]': String(interval.stripeIntervalCount),
              'metadata[neosaas_product_id]': product.id,
              'metadata[interval]': interval.key,
            }
            const created = await stripeFetch(creds.secretKey, '/prices', priceParams, 'POST')
            priceId = created.id
          }

          dbUpdate[interval.stripePriceField] = priceId
          result.pricesCreated.push(`${interval.key}:${priceId}`)
        }
      }

      if (Object.keys(dbUpdate).length > 0) {
        await db.update(products)
          .set(dbUpdate as any)
          .where(eq(products.id, productId))
      }
    }

    result.success = true
    console.log(`[stripe-products] ✅ Synced "${product.title}" → ${stripeProductId}`, {
      created: result.pricesCreated,
      skipped: result.pricesSkipped,
      archived: result.pricesArchived,
    })
    return result
  } catch (err: any) {
    console.error(`[stripe-products] syncProductToStripe error for ${productId}:`, err.message)
    result.error = err.message
    return result
  }
}

// ─── registerStripeWebhook ────────────────────────────────────────────────────

export interface WebhookRegistrationResult {
  success: boolean
  webhookId?: string
  webhookSecret?: string
  url?: string
  alreadyRegistered?: boolean
  error?: string
}

/**
 * Register the NeoSaaS webhook endpoint with Stripe.
 * - Uses POST /v1/webhook_endpoints to create the endpoint
 * - Returns the signing secret (whsec_...) that must be saved in service_api_configs
 * - Checks for existing registration first to avoid duplicates
 */
export async function registerStripeWebhook(
  appUrl: string,
  events: string[] = WEBHOOK_EVENTS
): Promise<WebhookRegistrationResult> {
  try {
    const creds = await getStripeCredentials(false)
    if (!creds?.secretKey) {
      return { success: false, error: 'Stripe credentials not configured' }
    }

    const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/stripe/webhook`

    // Check if this endpoint is already registered
    const existing = await stripeFetch(creds.secretKey, '/webhook_endpoints', {
      limit: '100',
    })

    const alreadyExists = (existing.data ?? []).find(
      (wh: any) => wh.url === webhookUrl && wh.status === 'enabled'
    )

    if (alreadyExists) {
      return {
        success: true,
        webhookId: alreadyExists.id,
        url: webhookUrl,
        alreadyRegistered: true,
        // Note: Stripe does not re-expose the secret — user must roll it if lost
      }
    }

    // Build params for webhook_endpoints
    const params: Record<string, string> = {
      url: webhookUrl,
      'metadata[source]': 'neosaas',
    }
    events.forEach((ev, i) => {
      params[`enabled_events[${i}]`] = ev
    })

    const created = await stripeFetch(
      creds.secretKey,
      '/webhook_endpoints',
      params,
      'POST'
    )

    const webhookSecret: string = created.secret // whsec_...

    // Persist the webhook secret back to service_api_configs
    try {
      const env = creds.isSandbox ? 'sandbox' : 'production'
      const existingConfig = await serviceApiRepository.getConfig('stripe', env as any) as any
      if (existingConfig) {
        await serviceApiRepository.upsertConfig('stripe', env as any, {
          ...existingConfig.config,
          webhookSecret,
        })
      }
    } catch (saveErr: any) {
      console.warn('[stripe-products] Could not auto-save webhook secret to DB:', saveErr.message)
      // Non-blocking — return the secret so the caller can save it manually
    }

    return {
      success: true,
      webhookId: created.id,
      webhookSecret,
      url: webhookUrl,
      alreadyRegistered: false,
    }
  } catch (err: any) {
    console.error('[stripe-products] registerStripeWebhook error:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── archiveStripeProduct ─────────────────────────────────────────────────────

/**
 * Archive a Stripe Product and all its active Prices when a NeoSaaS product is deleted.
 * Stripe does not allow deletion of Products that have Prices — we archive them instead.
 */
export async function archiveStripeProduct(stripeProductId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getStripeCredentials(false)
    if (!creds?.secretKey) return { success: false, error: 'Stripe credentials not configured' }

    // 1. Archive all active prices for this product
    const prices = await stripeFetch(creds.secretKey, '/prices', {
      product: stripeProductId,
      active: 'true',
      limit: '100',
    })

    for (const price of (prices.data ?? [])) {
      await stripeFetch(creds.secretKey, `/prices/${price.id}`, { active: 'false' }, 'POST')
    }

    // 2. Archive the product itself
    await stripeFetch(creds.secretKey, `/products/${stripeProductId}`, { active: 'false' }, 'POST')

    console.log(`[stripe-products] ✅ Archived Stripe Product ${stripeProductId} + ${(prices.data ?? []).length} prices`)
    return { success: true }
  } catch (err: any) {
    console.error(`[stripe-products] archiveStripeProduct error:`, err.message)
    return { success: false, error: err.message }
  }
}

// ─── syncUnsyncedProducts ─────────────────────────────────────────────────────

/**
 * Background startup helper — syncs any NeoSaaS products that are not yet
 * reflected in Stripe (e.g. products created before the auto-sync was in place).
 *
 * Targets:
 *   • one_time products  where stripePriceOneTime IS NULL and price > 0 and !isFree
 *   • any product        where stripeProductId IS NULL                   and !isFree
 *
 * Idempotent — safe to call on every server startup.
 * Errors are swallowed so a Stripe outage never breaks the boot sequence.
 */
export async function syncUnsyncedProducts(): Promise<void> {
  try {
    const creds = await getStripeCredentials(false)
    if (!creds?.secretKey) {
      // Stripe not configured yet — nothing to do
      return
    }

    // Fetch all non-free products and filter in JS to avoid complex nested Drizzle conditions
    const allProducts = await db
      .select({
        id: products.id,
        title: products.title,
        price: products.price,
        isFree: products.isFree,
        paymentType: products.paymentType,
        stripeProductId: products.stripeProductId,
        stripePriceOneTime: products.stripePriceOneTime,
      })
      .from(products)
      .where(eq(products.isFree, false))

    const needsSync = allProducts.filter((p) => {
      // No Stripe Product created yet
      if (!p.stripeProductId) return true
      // one_time product with a positive price but no Stripe Price
      const isOneTime = p.paymentType === 'one_time' || !p.paymentType
      if (isOneTime && (p.price ?? 0) > 0 && !p.stripePriceOneTime) return true
      return false
    })

    if (needsSync.length === 0) {
      console.log('[stripe-products] ✅ All products already synced to Stripe')
      return
    }

    console.log(`[stripe-products] 🔄 Startup sync: ${needsSync.length} product(s) not yet in Stripe`)

    for (const p of needsSync) {
      await syncProductToStripe(p.id).catch(err =>
        console.error(`[stripe-products] ⚠️  Could not sync "${p.title}": ${err.message}`)
      )
    }

    console.log('[stripe-products] ✅ Startup sync complete')
  } catch (err: any) {
    // Non-blocking — a startup sync failure must never crash the server
    console.error('[stripe-products] syncUnsyncedProducts failed (non-fatal):', err.message)
  }
}