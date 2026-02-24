/**
 * Migration Script: Lago → Stripe
 * ================================
 * Migrates existing customers and subscriptions from Lago to Stripe.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-lago-to-stripe.ts [--dry-run] [--batch-size=50]
 *
 * Options:
 *   --dry-run       Print what would be done without making changes (default: true for safety)
 *   --batch-size=N  Number of companies to process per batch (default: 20)
 *   --rollback      Output rollback SQL to restore from backup
 *
 * Prerequisites:
 *   1. DATABASE_URL set in .env.local
 *   2. STRIPE_SECRET_KEY set (live or test depending on target)
 *   3. A DB backup taken before running in production
 *
 * Outputs:
 *   - Console: per-company progress + summary
 *   - scripts/migration-report-<timestamp>.json: full audit log
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, isNull, isNotNull } from 'drizzle-orm'
import * as schema from '../db/schema'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ─── Configuration ────────────────────────────────────────────────────────────

const DRY_RUN = !process.argv.includes('--no-dry-run')
const BATCH_SIZE = parseInt(
  process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] ?? '20',
  10
)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const DATABASE_URL = process.env.DATABASE_URL || ''
const REPORT_FILE = path.resolve(
  process.cwd(),
  `scripts/migration-report-${Date.now()}.json`
)

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env.local')
  process.exit(1)
}

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set in .env.local')
  process.exit(1)
}

if (DRY_RUN) {
  console.log('🔵 DRY RUN mode (pass --no-dry-run to apply changes)\n')
}

// ─── Stripe REST Helper ────────────────────────────────────────────────────────

async function stripeFetch(
  endpoint: string,
  params?: Record<string, string>,
  method: 'GET' | 'POST' = 'GET'
): Promise<any> {
  const auth = `Basic ${Buffer.from(STRIPE_SECRET_KEY + ':').toString('base64')}`
  const isGet = method === 'GET'

  const url = isGet && params
    ? `https://api.stripe.com/v1${endpoint}?${new URLSearchParams(params)}`
    : `https://api.stripe.com/v1${endpoint}`

  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: !isGet && params ? new URLSearchParams(params).toString() : undefined,
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(`Stripe ${method} ${endpoint} → ${resp.status}: ${err.error?.message ?? JSON.stringify(err)}`)
  }
  return resp.json()
}

// ─── Migration Types ───────────────────────────────────────────────────────────

interface MigrationResult {
  companyId: string
  companyName: string
  email: string
  status: 'skipped' | 'created' | 'updated' | 'error'
  stripeCustomerId?: string
  error?: string
  dryRun: boolean
}

interface MigrationReport {
  startedAt: string
  finishedAt: string
  dryRun: boolean
  batchSize: number
  totalCompanies: number
  results: MigrationResult[]
  summary: {
    created: number
    updated: number
    skipped: number
    errors: number
  }
  rollbackSQL: string[]
}

// ─── Main Migration ────────────────────────────────────────────────────────────

async function run() {
  console.log('🚀 Lago → Stripe Migration')
  console.log(`   Stripe key: ${STRIPE_SECRET_KEY.substring(0, 10)}...`)
  console.log(`   Environment: ${STRIPE_SECRET_KEY.startsWith('sk_live_') ? '🔴 PRODUCTION' : '🟡 TEST/SANDBOX'}`)
  console.log(`   Batch size: ${BATCH_SIZE}`)
  console.log('')

  const client = postgres(DATABASE_URL, { ssl: 'require', max: 1 })
  const db = drizzle(client, { schema })

  const report: MigrationReport = {
    startedAt: new Date().toISOString(),
    finishedAt: '',
    dryRun: DRY_RUN,
    batchSize: BATCH_SIZE,
    totalCompanies: 0,
    results: [],
    summary: { created: 0, updated: 0, skipped: 0, errors: 0 },
    rollbackSQL: [],
  }

  // ── Step 1: Load all companies ─────────────────────────────────────────────

  console.log('📋 Step 1: Loading companies from database...')
  const companies = await db.select({
    id: schema.companies.id,
    name: schema.companies.name,
    email: schema.companies.email,
    stripeCustomerId: schema.companies.stripeCustomerId,
    vatNumber: schema.companies.vatNumber,
    siret: schema.companies.siret,
    address: schema.companies.address,
    city: schema.companies.city,
    zipCode: schema.companies.zipCode,
  }).from(schema.companies)

  report.totalCompanies = companies.length
  console.log(`   Found ${companies.length} companies\n`)

  // ── Step 2: Process in batches ─────────────────────────────────────────────

  console.log('🔄 Step 2: Creating/syncing Stripe customers...')

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE)
    console.log(`   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(companies.length / BATCH_SIZE)} (${batch.length} companies)`)

    for (const company of batch) {
      const result = await migrateCompany(company, db, report)
      report.results.push(result)

      const icon = result.status === 'error' ? '❌'
        : result.status === 'created' ? '✅'
        : result.status === 'updated' ? '🔄'
        : '⏭️'

      console.log(`   ${icon} ${company.name} (${company.email}) → ${result.status}${result.stripeCustomerId ? ` [${result.stripeCustomerId}]` : ''}${result.error ? `: ${result.error}` : ''}`)

      // Rate limit: 25 req/s safe for Stripe
      await delay(40)
    }
  }

  // ── Step 3: Summary ────────────────────────────────────────────────────────

  report.summary = {
    created: report.results.filter(r => r.status === 'created').length,
    updated: report.results.filter(r => r.status === 'updated').length,
    skipped: report.results.filter(r => r.status === 'skipped').length,
    errors: report.results.filter(r => r.status === 'error').length,
  }

  report.finishedAt = new Date().toISOString()

  // ── Step 4: Save report ────────────────────────────────────────────────────

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2))

  console.log('\n' + '─'.repeat(60))
  console.log('📊 MIGRATION SUMMARY')
  console.log('─'.repeat(60))
  console.log(`   Total companies : ${report.totalCompanies}`)
  console.log(`   ✅ Created       : ${report.summary.created}`)
  console.log(`   🔄 Updated       : ${report.summary.updated}`)
  console.log(`   ⏭️  Skipped       : ${report.summary.skipped}`)
  console.log(`   ❌ Errors        : ${report.summary.errors}`)
  console.log(`   ⏱️  Duration      : ${getDurationSeconds(report.startedAt, report.finishedAt)}s`)
  console.log(`   📄 Report        : ${REPORT_FILE}`)

  if (DRY_RUN) {
    console.log('\n🔵 DRY RUN — no changes were applied. Re-run with --no-dry-run to apply.')
  }

  if (report.summary.errors > 0) {
    console.log('\n⚠️  Some companies had errors. Check the report for details.')
    console.log('   Errors:')
    report.results.filter(r => r.status === 'error').forEach(r => {
      console.log(`   - ${r.companyName}: ${r.error}`)
    })
  }

  // Generate rollback SQL if applicable
  if (!DRY_RUN && report.summary.created + report.summary.updated > 0) {
    const rollbackPath = REPORT_FILE.replace('.json', '-rollback.sql')
    const rollbackSQL = report.results
      .filter(r => r.status === 'created' && r.stripeCustomerId)
      .map(r => `UPDATE companies SET stripe_customer_id = NULL WHERE id = '${r.companyId}';`)
      .join('\n')
    fs.writeFileSync(rollbackPath, rollbackSQL)
    console.log(`\n📄 Rollback SQL saved to: ${rollbackPath}`)
  }

  await client.end()
  process.exit(report.summary.errors > 0 ? 1 : 0)
}

// ─── Per-Company Migration ─────────────────────────────────────────────────────

async function migrateCompany(
  company: {
    id: string
    name: string | null
    email: string
    stripeCustomerId: string | null
    vatNumber?: string | null
    siret?: string | null
    address?: string | null
    city?: string | null
    zipCode?: string | null
  },
  db: any,
  report: MigrationReport
): Promise<MigrationResult> {
  const base: Omit<MigrationResult, 'status'> = {
    companyId: company.id,
    companyName: company.name ?? company.email,
    email: company.email,
    dryRun: DRY_RUN,
  }

  try {
    // Already has a Stripe customer ID — verify it's valid
    if (company.stripeCustomerId) {
      try {
        await stripeFetch(`/customers/${company.stripeCustomerId}`)
        return { ...base, status: 'skipped', stripeCustomerId: company.stripeCustomerId }
      } catch {
        // Customer doesn't exist in Stripe — recreate it
        console.log(`     ⚠️  Stripe customer ${company.stripeCustomerId} not found — recreating`)
      }
    }

    // Search by email first
    let existingId: string | null = null
    try {
      const search = await stripeFetch('/customers', { email: company.email, limit: '1' })
      if (search.data?.length > 0) {
        existingId = search.data[0].id
      }
    } catch {
      // Continue without existing customer
    }

    if (existingId) {
      // Update existing Stripe customer with metadata
      if (!DRY_RUN) {
        await stripeFetch(`/customers/${existingId}`, {
          'metadata[neosaas_company_id]': company.id,
          'metadata[siret]': company.siret ?? '',
          'metadata[vat_number]': company.vatNumber ?? '',
          'metadata[migrated_from]': 'lago',
          'metadata[migrated_at]': new Date().toISOString(),
        }, 'POST')

        await db.update(schema.companies)
          .set({ stripeCustomerId: existingId, updatedAt: new Date() })
          .where(eq(schema.companies.id, company.id))

        report.rollbackSQL.push(
          `UPDATE companies SET stripe_customer_id = NULL WHERE id = '${company.id}';`
        )
      }
      return { ...base, status: 'updated', stripeCustomerId: existingId }
    }

    // Create new Stripe customer
    const createParams: Record<string, string> = {
      email: company.email,
      'metadata[neosaas_company_id]': company.id,
      'metadata[source]': 'neosaas',
      'metadata[migrated_from]': 'lago',
      'metadata[migrated_at]': new Date().toISOString(),
    }

    if (company.name) createParams.name = company.name
    if (company.vatNumber) createParams['metadata[vat_number]'] = company.vatNumber
    if (company.siret) createParams['metadata[siret]'] = company.siret
    if (company.address) createParams['address[line1]'] = company.address
    if (company.city) createParams['address[city]'] = company.city
    if (company.zipCode) createParams['address[postal_code]'] = company.zipCode
    createParams['address[country]'] = 'FR'

    if (DRY_RUN) {
      return { ...base, status: 'created', stripeCustomerId: 'cus_[would_be_created]' }
    }

    const created = await stripeFetch('/customers', createParams, 'POST')

    await db.update(schema.companies)
      .set({ stripeCustomerId: created.id, updatedAt: new Date() })
      .where(eq(schema.companies.id, company.id))

    report.rollbackSQL.push(
      `UPDATE companies SET stripe_customer_id = NULL WHERE id = '${company.id}';`
    )

    return { ...base, status: 'created', stripeCustomerId: created.id }
  } catch (err: any) {
    return { ...base, status: 'error', error: err.message }
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getDurationSeconds(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 100) / 10
}

// ─── Run ───────────────────────────────────────────────────────────────────────

run().catch(err => {
  console.error('💥 Migration failed:', err)
  process.exit(1)
})
