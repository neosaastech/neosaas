#!/usr/bin/env tsx
/**
 * Migration Script: Stripe Payment Integration
 * Creates payment_methods and stripe_sync_logs tables
 * Adds Stripe-related fields to companies table
 *
 * Run: pnpm tsx scripts/migrate-stripe-tables.ts
 */

import { neon } from '@neondatabase/serverless'

async function migrateStripeTables() {
  console.log('🚀 Starting Stripe tables migration...\n')

  let databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found')
    process.exit(1)
  }

  // Remove channel_binding parameter which is not supported by @neondatabase/serverless
  databaseUrl = databaseUrl.replace(/[&?]channel_binding=[^&]*/g, '')

  const sql = neon(databaseUrl)

  try {
    // 1. Add Stripe fields to companies table
    console.log('📋 Step 1/3: Adding Stripe fields to companies table...')

    await sql`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS stripe_setup_intent_client_secret TEXT,
      ADD COLUMN IF NOT EXISTS stripe_default_payment_method TEXT
    `

    console.log('✅ Companies table updated\n')

    // 2. Create payment_methods table
    console.log('📋 Step 2/3: Creating payment_methods table...')

    await sql`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        stripe_payment_method_id TEXT NOT NULL UNIQUE,
        stripe_customer_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'card',
        card_brand TEXT,
        card_last4 TEXT,
        card_exp_month INTEGER,
        card_exp_year INTEGER,
        card_country TEXT,
        card_fingerprint TEXT,
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        holder_name TEXT,
        billing_address JSONB,
        metadata JSONB,
        added_by UUID REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_synced_at TIMESTAMP,
        expires_at TIMESTAMP
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id
      ON payment_methods(company_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id
      ON payment_methods(stripe_payment_method_id)
    `

    console.log('✅ payment_methods table created\n')

    // 3. Create stripe_sync_logs table
    console.log('📋 Step 3/3: Creating stripe_sync_logs table...')

    await sql`
      CREATE TABLE IF NOT EXISTS stripe_sync_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id),
        sync_type TEXT NOT NULL,
        status TEXT NOT NULL,
        cards_added INTEGER DEFAULT 0,
        cards_updated INTEGER DEFAULT 0,
        cards_removed INTEGER DEFAULT 0,
        error_message TEXT,
        metadata JSONB,
        duration INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_stripe_sync_logs_company_id
      ON stripe_sync_logs(company_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_stripe_sync_logs_created_at
      ON stripe_sync_logs(created_at DESC)
    `

    console.log('✅ stripe_sync_logs table created\n')

    // Verify tables exist
    console.log('🔍 Verifying tables...')

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('payment_methods', 'stripe_sync_logs')
      ORDER BY table_name
    `

    console.log('✅ Tables found:', tables.map(t => t.table_name).join(', '))

    // Verify columns in companies
    const companiesColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name LIKE 'stripe%'
      ORDER BY column_name
    `

    console.log('✅ Stripe columns in companies:', companiesColumns.map(c => c.column_name).join(', '))

    console.log('\n✅ ✅ ✅ Migration completed successfully! ✅ ✅ ✅\n')
    console.log('🎉 Your database is now ready for Stripe integration!')
    console.log('\nNext steps:')
    console.log('1. Configure Stripe credentials in /admin/api')
    console.log('2. Test adding a card at /dashboard/payment-methods')
    console.log('3. Configure Stripe webhook at https://dashboard.stripe.com/webhooks\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateStripeTables()
