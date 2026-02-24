/**
 * POST /api/admin/stripe/register-webhook
 * =========================================
 * Registers the NeoSaaS webhook endpoint with Stripe automatically.
 * Eliminates the need to manually copy/paste the webhook URL in the Stripe Dashboard.
 *
 * Body (JSON): { appUrl?: string }
 *   appUrl — the public base URL of this deployment (defaults to NEXT_PUBLIC_APP_URL)
 *
 * Returns:
 *   { success, webhookId, webhookSecret?, url, alreadyRegistered }
 *
 * GET /api/admin/stripe/register-webhook
 *   Returns the list of currently registered webhook endpoints on Stripe.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { registerStripeWebhook } from '@/lib/stripe-products'
import { getStripeCredentials } from '@/lib/stripe'

// ─── GET — list existing webhooks ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  const isAdmin = user?.roles?.some((r: string) => r === 'admin' || r === 'super_admin')
  if (!user || !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const creds = await getStripeCredentials(false)
    if (!creds?.secretKey) {
      return NextResponse.json({ success: false, error: 'Stripe credentials not configured' }, { status: 400 })
    }

    const auth = `Basic ${Buffer.from(creds.secretKey + ':').toString('base64')}`
    const resp = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=100', {
      headers: { Authorization: auth },
    })
    const data = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: data.error?.message }, { status: resp.status })
    }

    const webhooks = (data.data ?? []).map((wh: any) => ({
      id: wh.id,
      url: wh.url,
      status: wh.status,
      enabledEvents: wh.enabled_events,
      createdAt: new Date(wh.created * 1000).toISOString(),
    }))

    return NextResponse.json({ success: true, webhooks })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// ─── POST — register webhook ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  const isAdmin = user?.roles?.some((r: string) => r === 'admin' || r === 'super_admin')
  if (!user || !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const appUrl: string =
      body.appUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      `https://${request.headers.get('host')}`

    if (!appUrl) {
      return NextResponse.json(
        { success: false, error: 'appUrl is required (or set NEXT_PUBLIC_APP_URL)' },
        { status: 400 }
      )
    }

    const result = await registerStripeWebhook(appUrl)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      webhookId: result.webhookId,
      webhookSecret: result.webhookSecret,
      url: result.url,
      alreadyRegistered: result.alreadyRegistered ?? false,
      message: result.alreadyRegistered
        ? 'Webhook already registered on Stripe — no changes made.'
        : result.webhookSecret
          ? 'Webhook registered and secret saved to database automatically.'
          : 'Webhook registered. Save the webhookSecret manually if needed.',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
