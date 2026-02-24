import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getStripeCredentials } from '@/lib/stripe'

/**
 * Helper: call a Stripe endpoint and return a pass/fail check
 * NOTE: The balance endpoint does NOT support query params like ?limit=1
 * so we handle it separately (no query string).
 */
async function checkStripeEndpoint(
  secretKey: string,
  path: string,
  label: string
): Promise<{ ok: boolean; label: string; message: string }> {
  try {
    // Balance endpoint (/v1/balance) does NOT accept ?limit — call it without params
    const isBalance = path === 'balance'
    const url = isBalance
      ? `https://api.stripe.com/v1/${path}`
      : `https://api.stripe.com/v1/${path}?limit=1`

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      },
    })
    if (response.ok) {
      const data = await response.json()
      if (isBalance) {
        // Balance returns { available: [...], pending: [...] } — no .data array
        const available = data.available?.[0]
        const amount = available ? `${(available.amount / 100).toFixed(2)} ${available.currency?.toUpperCase()}` : 'OK'
        return { ok: true, label, message: `OK — Balance: ${amount}` }
      }
      const count = data.data?.length ?? 0
      return { ok: true, label, message: `OK — ${count} item(s) returned` }
    }
    const err = await response.json().catch(() => ({}))
    return { ok: false, label, message: `HTTP ${response.status}: ${err.error?.message || 'Unknown error'}` }
  } catch (err) {
    return { ok: false, label, message: `Network error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function GET(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────
    const user = await getCurrentUser()
    const isAdmin = user?.roles?.some(
      (r: string) => r === 'admin' || r === 'super_admin'
    )
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Read optional ?mode=test|live from query ─────────────────
    const requestedMode = request.nextUrl.searchParams.get('mode')
    const useSandbox = requestedMode === 'test'

    const timestamp = new Date().toISOString()
    const details: string[] = []

    // 1. Resolve credentials (respects mode)
    const creds = await getStripeCredentials(useSandbox)

    if (!creds || !creds.secretKey) {
      return NextResponse.json({
        success: false,
        timestamp,
        secretKeyValid: false,
        publishableKeyPresent: false,
        webhookConfigured: false,
        environment: 'unknown',
        checks: [],
        summary: 'Stripe secret key not configured. Add it in Admin > API Management.',
        details: ['No Stripe credentials found in service_api_configs or environment variables.'],
      })
    }

    const publishableKeyPresent = Boolean(creds.publishableKey)
    const webhookConfigured = Boolean(creds.webhookSecret)

    // Detect environment from key prefix
    const environment: 'test' | 'live' | 'unknown' = creds.secretKey.startsWith('sk_test_')
      ? 'test'
      : creds.secretKey.startsWith('sk_live_')
        ? 'live'
        : 'unknown'

    details.push(`Secret key prefix: ${creds.secretKey.substring(0, 7)}...`)
    if (publishableKeyPresent) {
      details.push(`Publishable key prefix: ${creds.publishableKey!.substring(0, 7)}...`)
    }
    details.push(`Webhook secret: ${webhookConfigured ? 'configured' : 'not configured'}`)
    details.push(`Environment: ${environment}`)

    // 2. Run comprehensive checks in parallel
    const [balanceCheck, customersCheck, productsCheck, taxRatesCheck, invoicesCheck] =
      await Promise.all([
        checkStripeEndpoint(creds.secretKey, 'balance', 'Balance'),
        checkStripeEndpoint(creds.secretKey, 'customers', 'Customers'),
        checkStripeEndpoint(creds.secretKey, 'products', 'Products'),
        checkStripeEndpoint(creds.secretKey, 'tax_rates', 'Tax Rates'),
        checkStripeEndpoint(creds.secretKey, 'invoices', 'Invoices'),
      ])

    const checks = [balanceCheck, customersCheck, productsCheck, taxRatesCheck, invoicesCheck]
    const secretKeyValid = balanceCheck.ok
    const allChecksPass = checks.every((c) => c.ok)

    for (const check of checks) {
      details.push(`[${check.ok ? '✓' : '✗'}] ${check.label}: ${check.message}`)
    }

    const success = secretKeyValid && publishableKeyPresent && allChecksPass
    const summary = success
      ? `Stripe fully connected (${environment === 'live' ? 'Production' : 'Test'} mode) — all 5 checks passed`
      : secretKeyValid
        ? `Stripe key valid but ${checks.filter((c) => !c.ok).length} check(s) failed`
        : 'Stripe secret key invalid or unreachable'

    return NextResponse.json({
      success,
      timestamp,
      secretKeyValid,
      publishableKeyPresent,
      webhookConfigured,
      environment,
      checks,
      summary,
      details,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        secretKeyValid: false,
        publishableKeyPresent: false,
        webhookConfigured: false,
        environment: 'unknown',
        checks: [],
        summary: `Test failed: ${error.message}`,
        details: [error.message],
      },
      { status: 500 }
    )
  }
}
