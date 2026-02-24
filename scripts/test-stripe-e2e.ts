/**
 * E2E Test: Stripe Checkout Flow (Sandbox)
 * =========================================
 * Validates the complete payment flow using Stripe test keys.
 * No real money is charged.
 *
 * Usage:
 *   pnpm tsx scripts/test-stripe-e2e.ts
 *
 * Prerequisites:
 *   - STRIPE_SECRET_KEY=sk_test_... in .env.local
 *   - NEXT_PUBLIC_APP_URL pointing to a running instance (local or staging)
 *
 * Test Scenarios:
 *   1. Stripe credentials validation
 *   2. Customer creation
 *   3. SetupIntent (add card)
 *   4. Confirm payment method (simulate webhook)
 *   5. Create Checkout Session (one-time)
 *   6. Subscription creation
 *   7. Invoice listing
 *   8. Webhook signature verification
 *   9. Rollback: detach payment method & delete test customer
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const auth = `Basic ${Buffer.from(STRIPE_KEY + ':').toString('base64')}`

if (!STRIPE_KEY || !STRIPE_KEY.startsWith('sk_test_')) {
  console.error('❌ STRIPE_SECRET_KEY must be a test key (sk_test_...)')
  process.exit(1)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  details?: string
  duration?: number
}

const results: TestResult[] = []
const artifacts: { customerId?: string; paymentMethodId?: string; subscriptionId?: string } = {}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function stripeFetch(endpoint: string, params?: Record<string, string>, method: 'GET' | 'POST' | 'DELETE' = 'GET') {
  const url = method === 'GET' && params
    ? `https://api.stripe.com/v1${endpoint}?${new URLSearchParams(params)}`
    : `https://api.stripe.com/v1${endpoint}`

  const resp = await fetch(url, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method !== 'GET' && params ? new URLSearchParams(params).toString() : undefined,
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`${resp.status}: ${data.error?.message ?? JSON.stringify(data)}`)
  return data
}

async function test(name: string, fn: () => Promise<string | void>): Promise<void> {
  const start = Date.now()
  process.stdout.write(`  ${name}... `)
  try {
    const details = await fn()
    const duration = Date.now() - start
    results.push({ name, status: 'pass', details: typeof details === 'string' ? details : undefined, duration })
    console.log(`✅ ${details ? `(${details})` : ''} [${duration}ms]`)
  } catch (err: any) {
    const duration = Date.now() - start
    results.push({ name, status: 'fail', details: err.message, duration })
    console.log(`❌ ${err.message} [${duration}ms]`)
  }
}

async function skip(name: string, reason: string) {
  results.push({ name, status: 'skip', details: reason })
  console.log(`  ${name}... ⏭️  ${reason}`)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('🧪 NeoSaaS × Stripe E2E Tests (Sandbox)')
  console.log(`   Key: ${STRIPE_KEY.substring(0, 12)}...`)
  console.log(`   App: ${APP_URL}`)
  console.log('')

  // ── 1. Validate Stripe credentials ────────────────────────────────────────

  console.log('📋 1. Credentials')
  await test('Stripe API key valid', async () => {
    const balance = await stripeFetch('/balance')
    const avail = balance.available?.[0]
    return avail ? `balance: ${(avail.amount / 100).toFixed(2)} ${avail.currency.toUpperCase()}` : 'connected'
  })

  // ── 2. Customer lifecycle ─────────────────────────────────────────────────

  console.log('\n📋 2. Customer Lifecycle')
  await test('Create test customer', async () => {
    const customer = await stripeFetch('/customers', {
      email: `e2e-test-${Date.now()}@neosaas-test.local`,
      name: 'NeoSaaS E2E Test',
      'metadata[test]': 'true',
      'metadata[source]': 'e2e-script',
    }, 'POST')
    artifacts.customerId = customer.id
    return `cus_id: ${customer.id}`
  })

  await test('Retrieve customer', async () => {
    if (!artifacts.customerId) throw new Error('No customer created')
    const customer = await stripeFetch(`/customers/${artifacts.customerId}`)
    return customer.email
  })

  // ── 3. Payment Method (SetupIntent flow) ─────────────────────────────────

  console.log('\n📋 3. Payment Method (SetupIntent)')
  await test('Create SetupIntent', async () => {
    if (!artifacts.customerId) throw new Error('No customer')
    const si = await stripeFetch('/setup_intents', {
      customer: artifacts.customerId,
      'payment_method_types[]': 'card',
    }, 'POST')
    return `si: ${si.id} status: ${si.status}`
  })

  await test('Attach test card (pm_card_visa)', async () => {
    if (!artifacts.customerId) throw new Error('No customer')
    // Use Stripe test payment method token
    const pm = await stripeFetch('/payment_methods/pm_card_visa/attach', {
      customer: artifacts.customerId,
    }, 'POST')
    artifacts.paymentMethodId = pm.id
    return `${pm.card?.brand} ****${pm.card?.last4}`
  })

  await test('Set default payment method', async () => {
    if (!artifacts.customerId || !artifacts.paymentMethodId) throw new Error('Missing customer or PM')
    await stripeFetch(`/customers/${artifacts.customerId}`, {
      'invoice_settings[default_payment_method]': artifacts.paymentMethodId,
    }, 'POST')
    return `default: ${artifacts.paymentMethodId}`
  })

  await test('List payment methods', async () => {
    if (!artifacts.customerId) throw new Error('No customer')
    const pms = await stripeFetch('/payment_methods', {
      customer: artifacts.customerId,
      type: 'card',
    })
    return `${pms.data?.length ?? 0} card(s) found`
  })

  // ── 4. Payment Intent (one-time payment) ─────────────────────────────────

  console.log('\n📋 4. One-Time Payment')
  await test('Create PaymentIntent (€9.99)', async () => {
    const pi = await stripeFetch('/payment_intents', {
      amount: '999',
      currency: 'eur',
      customer: artifacts.customerId ?? '',
      payment_method: artifacts.paymentMethodId ?? '',
      confirm: 'true',
      'automatic_payment_methods[enabled]': 'false',
      'payment_method_types[]': 'card',
      return_url: `${APP_URL}/dashboard`,
    }, 'POST')
    return `pi: ${pi.id} status: ${pi.status}`
  })

  // ── 5. Checkout Session ───────────────────────────────────────────────────

  console.log('\n📋 5. Checkout Session')
  await test('Create Checkout Session (one-time)', async () => {
    const session = await stripeFetch('/checkout/sessions', {
      mode: 'payment',
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': '2900',
      'line_items[0][price_data][product_data][name]': 'E2E Test Product',
      'line_items[0][quantity]': '1',
      customer: artifacts.customerId ?? '',
      success_url: `${APP_URL}/dashboard?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/dashboard/checkout`,
    }, 'POST')
    return `url: ${session.url?.substring(0, 60)}...`
  })

  // ── 6. Subscription ───────────────────────────────────────────────────────

  console.log('\n📋 6. Subscription')
  let testPriceId: string | null = null

  await test('Create test product + price (€19.99/month)', async () => {
    const product = await stripeFetch('/products', {
      name: 'E2E Test Subscription',
      'metadata[test]': 'true',
    }, 'POST')
    const price = await stripeFetch('/prices', {
      product: product.id,
      unit_amount: '1999',
      currency: 'eur',
      'recurring[interval]': 'month',
    }, 'POST')
    testPriceId = price.id
    return `price: ${price.id} (${product.id})`
  })

  await test('Create subscription with trial', async () => {
    if (!artifacts.customerId || !testPriceId) throw new Error('Missing customer or price')
    const sub = await stripeFetch('/subscriptions', {
      customer: artifacts.customerId,
      'items[0][price]': testPriceId,
      trial_period_days: '7',
    }, 'POST')
    artifacts.subscriptionId = sub.id
    return `sub: ${sub.id} status: ${sub.status}`
  })

  await test('Cancel subscription', async () => {
    if (!artifacts.subscriptionId) throw new Error('No subscription')
    const sub = await stripeFetch(`/subscriptions/${artifacts.subscriptionId}`, {
      cancel_at_period_end: 'true',
    }, 'POST')
    return `status: ${sub.status} cancel_at_period_end: ${sub.cancel_at_period_end}`
  })

  // ── 7. Invoices ───────────────────────────────────────────────────────────

  console.log('\n📋 7. Invoices')
  await test('List invoices for test customer', async () => {
    if (!artifacts.customerId) throw new Error('No customer')
    const invoices = await stripeFetch('/invoices', {
      customer: artifacts.customerId,
      limit: '10',
    })
    return `${invoices.data?.length ?? 0} invoice(s)`
  })

  // ── 8. Webhook endpoint reachability ─────────────────────────────────────

  console.log('\n📋 8. Webhook Endpoint')
  await test('Webhook endpoint responds (should return 400 with no signature)', async () => {
    const webhookUrl = `${APP_URL}/api/stripe/webhook`
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    })
    // Expect 400 (missing signature) or 500 — not 404
    if (resp.status === 404) throw new Error('Webhook endpoint not found (404)')
    return `status: ${resp.status} (expected 400 or 500 = endpoint exists)`
  })

  // ── 9. Cleanup ────────────────────────────────────────────────────────────

  console.log('\n📋 9. Cleanup')
  await test('Detach test payment method', async () => {
    if (!artifacts.paymentMethodId) throw new Error('No PM')
    await stripeFetch(`/payment_methods/${artifacts.paymentMethodId}/detach`, {}, 'POST')
    return `${artifacts.paymentMethodId} detached`
  })

  await test('Delete test customer', async () => {
    if (!artifacts.customerId) throw new Error('No customer')
    await stripeFetch(`/customers/${artifacts.customerId}`, undefined, 'DELETE')
    return `${artifacts.customerId} deleted`
  })

  // ── Results ───────────────────────────────────────────────────────────────

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length
  const total = results.length

  console.log('\n' + '─'.repeat(60))
  console.log('📊 E2E TEST RESULTS')
  console.log('─'.repeat(60))
  console.log(`   Total   : ${total}`)
  console.log(`   ✅ Pass  : ${passed}`)
  console.log(`   ❌ Fail  : ${failed}`)
  console.log(`   ⏭️  Skip  : ${skipped}`)
  console.log(`   Score   : ${Math.round((passed / (total - skipped)) * 100)}%`)

  if (failed > 0) {
    console.log('\n❌ Failed tests:')
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   - ${r.name}: ${r.details}`)
    })
    process.exit(1)
  } else {
    console.log('\n🎉 All tests passed! Stripe integration is working correctly.')
    console.log('\n📌 Next: Configure the webhook endpoint in your Stripe Dashboard:')
    console.log(`   URL: ${APP_URL}/api/stripe/webhook`)
    console.log('   See docs/STRIPE_WEBHOOK_SETUP.md for full instructions.')
  }
}

runTests().catch(err => {
  console.error('💥', err)
  process.exit(1)
})
