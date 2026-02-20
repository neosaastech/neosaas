/**
 * Stripe Products & Prices Seeder
 * =================================
 * Creates Stripe Products and recurring Prices for all subscription products
 * in the NeoSaaS database. Updates each product with the resulting Stripe price IDs.
 *
 * Usage:
 *   pnpm tsx scripts/seed-stripe-products.ts [--dry-run]
 *
 * What it does:
 *   1. Loads all products with paymentType = 'subscription' from DB
 *   2. For each product + interval (weekly / monthly / yearly):
 *      a. Creates a Stripe Product (or finds existing by metadata)
 *      b. Creates a recurring Stripe Price for that interval
 *   3. Stores the Stripe price_id in the DB (products.stripePriceMonthly etc.)
 *      — NOTE: The schema currently stores stripePriceId per subscription,
 *        not per product. This script outputs a mapping file for reference.
 *
 * Output:
 *   scripts/stripe-price-map-<timestamp>.json  — product_id → { weekly, monthly, yearly } price IDs
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const DRY_RUN = !process.argv.includes('--no-dry-run')
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const DATABASE_URL = process.env.DATABASE_URL || ''

if (!DATABASE_URL) { console.error('❌ DATABASE_URL not set'); process.exit(1) }
if (!STRIPE_SECRET_KEY) { console.error('❌ STRIPE_SECRET_KEY not set'); process.exit(1) }

if (DRY_RUN) {
  console.log('🔵 DRY RUN mode (pass --no-dry-run to apply)\n')
}

// ─── Stripe Helper ─────────────────────────────────────────────────────────────

const auth = `Basic ${Buffer.from(STRIPE_SECRET_KEY + ':').toString('base64')}`

async function stripeFetch(endpoint: string, params?: Record<string, string>, method: 'GET' | 'POST' = 'GET') {
  const url = method === 'GET' && params
    ? `https://api.stripe.com/v1${endpoint}?${new URLSearchParams(params)}`
    : `https://api.stripe.com/v1${endpoint}`

  const resp = await fetch(url, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' && params ? new URLSearchParams(params).toString() : undefined,
  })

  const data = await resp.json()
  if (!resp.ok) throw new Error(`Stripe ${method} ${endpoint} → ${resp.status}: ${data.error?.message}`)
  return data
}

// ─── Interval config ───────────────────────────────────────────────────────────

type Interval = 'weekly' | 'monthly' | 'yearly'

const INTERVALS: { key: Interval; stripeInterval: string; stripeIntervalCount: number; priceField: keyof typeof schema.products }[] = [
  { key: 'weekly',  stripeInterval: 'week',  stripeIntervalCount: 1, priceField: 'subscriptionPriceWeekly' },
  { key: 'monthly', stripeInterval: 'month', stripeIntervalCount: 1, priceField: 'subscriptionPriceMonthly' },
  { key: 'yearly',  stripeInterval: 'year',  stripeIntervalCount: 1, priceField: 'subscriptionPriceYearly' },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

interface PriceMap {
  productId: string
  productName: string
  prices: Record<Interval, string | null>
  errors: string[]
}

async function run() {
  console.log('🚀 Stripe Products & Prices Seeder')
  console.log(`   Key: ${STRIPE_SECRET_KEY.substring(0, 10)}...  [${STRIPE_SECRET_KEY.startsWith('sk_live_') ? '🔴 PRODUCTION' : '🟡 TEST'}]\n`)

  const client = postgres(DATABASE_URL, { ssl: 'require', max: 1 })
  const db = drizzle(client, { schema })

  // Load subscription products
  const products = await db.select().from(schema.products)
    .where(eq(schema.products.paymentType, 'subscription'))

  console.log(`📦 Found ${products.length} subscription products\n`)

  const priceMap: PriceMap[] = []

  for (const product of products) {
    const entry: PriceMap = {
      productId: product.id,
      productName: product.title,
      prices: { weekly: null, monthly: null, yearly: null },
      errors: [],
    }

    console.log(`\n🔧 ${product.title} (${product.id})`)

    // Step 1: Find or create Stripe Product
    let stripeProductId: string | null = null

    if (!DRY_RUN) {
      try {
        // Search by metadata
        const search = await stripeFetch('/products/search', {
          query: `metadata["neosaas_product_id"]:"${product.id}"`,
        })

        if (search.data?.length > 0) {
          stripeProductId = search.data[0].id
          console.log(`   ℹ️  Stripe Product already exists: ${stripeProductId}`)
        } else {
          // Create Stripe Product
          const params: Record<string, string> = {
            name: product.title,
            'metadata[neosaas_product_id]': product.id,
            'metadata[source]': 'neosaas',
          }
          if (product.description) params.description = product.description.substring(0, 500)

          const created = await stripeFetch('/products', params, 'POST')
          stripeProductId = created.id
          console.log(`   ✅ Stripe Product created: ${stripeProductId}`)
        }
      } catch (err: any) {
        console.log(`   ❌ Failed to create Stripe Product: ${err.message}`)
        entry.errors.push(`Product creation: ${err.message}`)
        priceMap.push(entry)
        continue
      }
    } else {
      stripeProductId = 'prod_[dry_run]'
      console.log(`   🔵 Would create Stripe Product for: ${product.title}`)
    }

    // Step 2: Create Prices for each active interval
    for (const interval of INTERVALS) {
      const amountCents = product[interval.priceField] as number | null

      if (!amountCents || amountCents <= 0) {
        console.log(`   ⏭️  ${interval.key}: no price set — skipping`)
        continue
      }

      const currency = (product.currency || 'EUR').toLowerCase()

      if (DRY_RUN) {
        console.log(`   🔵 Would create ${interval.key} price: ${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`)
        entry.prices[interval.key] = 'price_[dry_run]'
        continue
      }

      try {
        // Check if price already exists for this product + interval
        const existingPrices = await stripeFetch('/prices', {
          product: stripeProductId!,
          active: 'true',
          limit: '20',
        })

        const existing = (existingPrices.data ?? []).find((p: any) =>
          p.recurring?.interval === interval.stripeInterval &&
          p.recurring?.interval_count === interval.stripeIntervalCount &&
          p.unit_amount === amountCents &&
          p.currency === currency
        )

        if (existing) {
          console.log(`   ✅ ${interval.key} price already exists: ${existing.id} (${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()})`)
          entry.prices[interval.key] = existing.id
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
          const created = await stripeFetch('/prices', priceParams, 'POST')
          console.log(`   ✅ ${interval.key} price created: ${created.id} (${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()})`)
          entry.prices[interval.key] = created.id
        }
      } catch (err: any) {
        console.log(`   ❌ ${interval.key}: ${err.message}`)
        entry.errors.push(`Price ${interval.key}: ${err.message}`)
      }
    }

    priceMap.push(entry)
  }

  // Save price map
  const outputPath = path.resolve(process.cwd(), `scripts/stripe-price-map-${Date.now()}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(priceMap, null, 2))

  // Summary
  const total = priceMap.length
  const withErrors = priceMap.filter(p => p.errors.length > 0).length
  const allPrices = priceMap.flatMap(p => Object.values(p.prices)).filter(Boolean)

  console.log('\n' + '─'.repeat(60))
  console.log('📊 SUMMARY')
  console.log('─'.repeat(60))
  console.log(`   Products processed : ${total}`)
  console.log(`   Prices created     : ${allPrices.length}`)
  console.log(`   Errors             : ${withErrors}`)
  console.log(`   Output file        : ${outputPath}`)

  if (!DRY_RUN) {
    console.log('\n📌 Next steps:')
    console.log('   1. Use the price IDs from the output file when creating subscriptions')
    console.log('   2. Pass the correct price_id to createStripeSubscription()')
    console.log('   3. Store the price_id in subscriptions.stripePriceId via the webhook')
  }

  await client.end()
}

run().catch(err => {
  console.error('💥 Seeder failed:', err)
  process.exit(1)
})
