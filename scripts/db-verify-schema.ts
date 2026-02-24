/**
 * Verify that critical database columns exist
 *
 * Used after drizzle-kit push to confirm schema was applied.
 * Exits with code 1 if any required columns are missing.
 *
 * Usage: npx tsx scripts/db-verify-schema.ts
 */
import { neon } from '@neondatabase/serverless'

function cleanDatabaseUrl(url: string): string {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '')
}

const REQUIRED_COLUMNS: { table: string; columns: string[] }[] = [
  {
    table: 'products',
    columns: [
      'payment_type',
      'subscription_price_weekly',
      'subscription_price_monthly',
      'subscription_price_yearly',
      'stripe_product_id',
      'stripe_price_one_time',
      'stripe_price_weekly',
      'stripe_price_monthly',
      'stripe_price_yearly',
    ],
  },
  {
    table: 'appointments',
    columns: [
      'stripe_payment_intent_id',
      'payment_status',
      'paid_at',
      'is_paid',
      'attendee_email',
      'attendee_name',
    ],
  },
  {
    table: 'subscriptions',
    columns: [
      'stripe_subscription_id',
      'stripe_price_id',
      'current_period_start',
      'current_period_end',
      'cancel_at_period_end',
    ],
  },
  {
    table: 'companies',
    columns: [
      'stripe_customer_id',
      'stripe_default_payment_method',
    ],
  },
  // Table payment_methods (créée par migration 0000 + safety net db-ensure-columns)
  {
    table: 'payment_methods',
    columns: [
      'id',
      'company_id',
      'stripe_payment_method_id',
      'stripe_customer_id',
      'is_default',
      'is_active',
      'holder_name',
      'card_brand',
      'card_last4',
    ],
  },
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }

  const sql = neon(cleanDatabaseUrl(url))
  let allOk = true

  for (const { table, columns } of REQUIRED_COLUMNS) {
    const result = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = ${table}
      AND column_name = ANY(${columns})
      ORDER BY column_name
    `

    const found = result.map((r: any) => r.column_name)
    const missing = columns.filter((c) => !found.includes(c))

    if (missing.length > 0) {
      console.error(`❌ Table "${table}" missing columns: ${missing.join(', ')}`)
      allOk = false
    } else {
      console.log(`✅ Table "${table}" has all ${columns.length} required columns`)
    }
  }

  if (!allOk) {
    console.error('')
    console.error('Schema verification FAILED. The database is missing required columns.')
    console.error('Run: npx tsx scripts/db-ensure-columns.ts')
    process.exit(1)
  }

  console.log('✅ Schema verification passed')
}

main().catch((e) => {
  console.error('❌ Schema verification error:', e.message)
  process.exit(1)
})
