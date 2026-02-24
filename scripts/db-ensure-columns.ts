/**
 * DB Safety Net: Ensure critical tables and columns exist
 *
 * This script runs BEFORE migrate.ts during deployment.
 * It uses CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS
 * to guarantee tables and columns are present, acting as a fallback if
 * migrations fail silently or are marked as applied without running.
 *
 * Source of truth: db/schema.ts (this script just ensures structure exists)
 *
 * Usage: npx tsx scripts/db-ensure-columns.ts
 */
import { neon } from '@neondatabase/serverless'

function cleanDatabaseUrl(url: string): string {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '')
}

// ── Tables that must exist ──────────────────────────────────────────────────
// Add new entries here when adding NEW TABLES to schema.ts
// The SQL must use CREATE TABLE IF NOT EXISTS
const REQUIRED_TABLES = [
  {
    name: 'payment_methods',
    sql: `
      CREATE TABLE IF NOT EXISTS "payment_methods" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "company_id" uuid NOT NULL,
        "stripe_payment_method_id" text NOT NULL,
        "stripe_customer_id" text NOT NULL,
        "type" text DEFAULT 'card' NOT NULL,
        "card_brand" text,
        "card_last4" text,
        "card_exp_month" integer,
        "card_exp_year" integer,
        "card_country" text,
        "card_fingerprint" text,
        "is_default" boolean DEFAULT false NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "holder_name" text,
        "billing_address" jsonb,
        "metadata" jsonb,
        "added_by" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "last_synced_at" timestamp,
        "expires_at" timestamp,
        CONSTRAINT "payment_methods_stripe_payment_method_id_unique" UNIQUE("stripe_payment_method_id")
      )
    `,
    // Additional statements run after the CREATE TABLE (FK, indexes)
    post: [
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'payment_methods_company_id_companies_id_fk'
        ) THEN
          ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_company_id_companies_id_fk"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'payment_methods_added_by_users_id_fk'
        ) THEN
          ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_added_by_users_id_fk"
          FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE NO ACTION;
        END IF;
      END $$`,
      `CREATE INDEX IF NOT EXISTS "idx_payment_methods_company_id" ON "payment_methods"("company_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_payment_methods_stripe_id" ON "payment_methods"("stripe_payment_method_id")`,
    ],
  },
]

// Columns that must exist - add new entries here when adding columns to schema.ts
const REQUIRED_COLUMNS = [
  // Orders - ensure product link is available for notifications
  {
    table: 'order_items',
    column: 'product_id',
    sql: `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "product_id" uuid`,
  },
  // Payment Type System - v5.0
  {
    table: 'products',
    column: 'payment_type',
    sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "payment_type" text DEFAULT 'one_time'`,
  },
  {
    table: 'products',
    column: 'subscription_price_weekly',
    sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subscription_price_weekly" integer`,
  },
  {
    table: 'products',
    column: 'subscription_price_monthly',
    sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subscription_price_monthly" integer`,
  },
  {
    table: 'products',
    column: 'subscription_price_yearly',
    sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subscription_price_yearly" integer`,
  },
  // ── Stripe Integration (Stripe migration) ────────────────────────────────
  // Root cause of "DB stays in same state" bug:
  // If the companies table existed before the Stripe migration, CREATE TABLE
  // in the migration SQL is skipped ("already exists"), so these columns are
  // never added. The app crashes with "column does not exist" at runtime.
  {
    table: 'companies',
    column: 'stripe_customer_id',
    sql: `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text`,
  },
  {
    table: 'companies',
    column: 'stripe_setup_intent_client_secret',
    sql: `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "stripe_setup_intent_client_secret" text`,
  },
  {
    table: 'companies',
    column: 'stripe_default_payment_method',
    sql: `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "stripe_default_payment_method" text`,
  },
  // Stripe Sync Fields - v6.0 (auto-sync products NeoSaaS → Stripe)
  {
    table: 'products',
    column: 'stripe_product_id',
    sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_product_id" text`,
  },
  {
    table: 'products',
    column: 'stripe_price_one_time',
    sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_price_one_time" text`,
  },
  {
    table: 'products',
    column: 'stripe_price_weekly',
    sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_price_weekly" text`,
  },
  {
    table: 'products',
    column: 'stripe_price_monthly',
    sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_price_monthly" text`,
  },
  {
    table: 'products',
    column: 'stripe_price_yearly',
    sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_price_yearly" text`,
  },
  // ── Appointments Stripe Payment (migration Lago → Stripe) ─────────────────
  // La table appointments a été créée initialement avec lago_invoice_id.
  // La colonne Stripe doit être garantie par ce script car la migration 0000
  // est skippée si la table existait déjà (CREATE TABLE ignoré).
  {
    table: 'appointments',
    column: 'stripe_payment_intent_id',
    sql: `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text`,
  },
  // ── Subscriptions Stripe (migration Lago → Stripe) ────────────────────────
  {
    table: 'subscriptions',
    column: 'stripe_subscription_id',
    sql: `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text`,
  },
  {
    table: 'subscriptions',
    column: 'stripe_price_id',
    sql: `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_price_id" text`,
  },
  {
    table: 'subscriptions',
    column: 'current_period_start',
    sql: `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_start" timestamp`,
  },
  {
    table: 'subscriptions',
    column: 'current_period_end',
    sql: `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_end" timestamp`,
  },
  {
    table: 'subscriptions',
    column: 'cancel_at_period_end',
    sql: `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false`,
  },
  // ── Orders Stripe Invoice PDF links ───────────────────────────────────────
  {
    table: 'orders',
    column: 'stripe_invoice_id',
    sql: `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stripe_invoice_id" text`,
  },
  {
    table: 'orders',
    column: 'invoice_pdf',
    sql: `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_pdf" text`,
  },
  {
    table: 'orders',
    column: 'hosted_invoice_url',
    sql: `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "hosted_invoice_url" text`,
  },
  // ── Orders Stripe Tax (TVA retournée par le webhook invoice.paid) ─────────
  {
    table: 'orders',
    column: 'tax_amount',
    sql: `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_amount" integer`,
  },
]

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!url) {
    console.log('⚠️  DATABASE_URL not set, skipping column check')
    return
  }

  const sql = neon(cleanDatabaseUrl(url))

  // ── Step 1: Ensure required tables exist ──────────────────────────────────
  console.log('🔍 Ensuring critical database tables exist...')
  for (const table of REQUIRED_TABLES) {
    try {
      const exists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = ${table.name}
        ) AS exists
      `
      if (exists[0]?.exists) {
        console.log(`  ✅ Table ${table.name} already exists`)
        continue
      }
      await sql.unsafe(table.sql)
      console.log(`  ✅ Created table ${table.name}`)
      // Run post-creation statements (FK, indexes)
      for (const stmt of table.post ?? []) {
        try {
          await sql.unsafe(stmt)
        } catch (e: unknown) {
          console.warn(`  ⚠️  Post-create stmt on ${table.name}: ${(e as Error)?.message}`)
        }
      }
    } catch (e: unknown) {
      console.error(`  ❌ Error creating table ${table.name}: ${(e as Error)?.message}`)
    }
  }

  // ── Step 2: Ensure required columns exist ─────────────────────────────────
  console.log('🔍 Ensuring critical database columns exist...')

  let added = 0
  let skipped = 0

  for (const col of REQUIRED_COLUMNS) {
    try {
      // Check if column exists first
      const result = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = ${col.table} AND column_name = ${col.column}
      `

      if (result.length > 0) {
        skipped++
        continue
      }

      // Column doesn't exist - add it
      await sql.query(col.sql)
      console.log(`  ✅ Added ${col.table}.${col.column}`)
      added++
    } catch (e: any) {
      console.error(`  ❌ Error on ${col.table}.${col.column}: ${e.message}`)
    }
  }

  if (added > 0) {
    console.log(`✅ Added ${added} missing column(s), ${skipped} already existed`)
  } else {
    console.log(`✅ All ${skipped} columns already exist`)
  }
}

main().catch((e) => {
  console.error('❌ db-ensure-columns failed:', e.message)
  // Don't exit with error - this is a safety net, not the primary mechanism
  process.exit(0)
})
