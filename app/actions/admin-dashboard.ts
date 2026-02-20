"use server"

import { getDashboardStats } from "@/lib/data/admin-dashboard"
import { getAllPayments } from "@/lib/data/payments"
import { getAllInvoices } from "@/lib/data/invoices"
import { getCurrentUser } from "@/lib/auth"
import { getStripeCredentials } from "@/lib/stripe"
import { db } from "@/db"
import { userRoles, roles, companies, subscriptions } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Verify admin access for server actions
 * Uses the same auth method as /api/auth/me for consistency
 * Throws an error instead of redirecting (for client component compatibility)
 */
async function verifyAdminAccess() {
  // Use getCurrentUser from lib/auth (same as /api/auth/me)
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  // Check roles from database (real-time verification)
  const userRolesData = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.userId))

  const roleNames = userRolesData.map((r) => r.roleName)
  const hasAdminRole = roleNames.includes("admin") || roleNames.includes("super_admin")

  if (!hasAdminRole) {
    throw new Error("Not authorized - admin access required")
  }

  return user
}

// ── REST helper (mirrors the one in payments.ts) ──────────────────────────────
async function stripeFetch(
  secretKey: string,
  endpoint: string,
  params?: Record<string, string>,
  method: 'GET' | 'POST' | 'DELETE' = 'GET'
) {
  const url = `https://api.stripe.com/v1${endpoint}`
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }
  if (params && method !== 'GET' && method !== 'DELETE') {
    options.body = new URLSearchParams(params).toString()
  }
  return fetch(url, options)
}

export async function fetchAdminDashboardStats() {
  // Verify admin access (throws error instead of redirect)
  await verifyAdminAccess()

  return await getDashboardStats()
}

export async function fetchAdminPayments() {
  await verifyAdminAccess()
  return await getAllPayments()
}

export async function fetchAdminInvoices() {
  await verifyAdminAccess()
  return await getAllInvoices()
}

// ============================================================================
// Admin Subscription Management
// ============================================================================

/**
 * Get all subscriptions for a specific company (admin use only).
 * Fetches live data from Stripe API so status is always current.
 */
export async function adminGetCompanySubscriptions(companyId: string): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  await verifyAdminAccess()

  const creds = await getStripeCredentials()
  if (!creds?.secretKey) return { success: true, data: [] }

  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) })
  if (!company?.stripeCustomerId) return { success: true, data: [] }

  const resp = await stripeFetch(creds.secretKey, '/subscriptions', {
    customer: company.stripeCustomerId,
    limit: '20',
    'expand[]': 'data.latest_invoice',
  }, 'GET')

  if (!resp.ok) return { success: true, data: [] }
  const data = await resp.json()
  return { success: true, data: data.data || [] }
}

/**
 * Get all subscriptions across all companies (admin overview).
 * Reads from the local DB (subscriptions table) + enriches with company name.
 */
export async function adminGetAllSubscriptions(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    stripeSubscriptionId: string
    companyId: string
    companyName: string | null
    companyEmail: string | null
    stripePriceId: string
    status: string
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
    createdAt: Date
  }>
  error?: string
}> {
  await verifyAdminAccess()

  const rows = await db
    .select({
      id: subscriptions.id,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      companyId: subscriptions.customerId,
      companyName: companies.name,
      companyEmail: companies.email,
      stripePriceId: subscriptions.stripePriceId,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .leftJoin(companies, eq(subscriptions.customerId, companies.id))
    .orderBy(subscriptions.createdAt)

  return { success: true, data: rows }
}

/**
 * Cancel a subscription on behalf of a client (admin only).
 * Does NOT verify company ownership — admin can manage any subscription.
 */
export async function adminCancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<{ success: boolean; error?: string }> {
  await verifyAdminAccess()

  const creds = await getStripeCredentials()
  if (!creds?.secretKey) return { success: false, error: 'Stripe not configured' }

  if (immediately) {
    const resp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {}, 'DELETE')
    if (!resp.ok) {
      const err = await resp.json()
      return { success: false, error: err.error?.message || 'Failed to cancel subscription' }
    }
  } else {
    const resp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {
      cancel_at_period_end: 'true',
    }, 'POST')
    if (!resp.ok) {
      const err = await resp.json()
      return { success: false, error: err.error?.message || 'Failed to schedule cancellation' }
    }
  }

  return { success: true }
}

/**
 * Resume a subscription scheduled for cancellation (admin only).
 */
export async function adminResumeSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  await verifyAdminAccess()

  const creds = await getStripeCredentials()
  if (!creds?.secretKey) return { success: false, error: 'Stripe not configured' }

  const resp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {
    cancel_at_period_end: 'false',
  }, 'POST')
  if (!resp.ok) {
    const err = await resp.json()
    return { success: false, error: err.error?.message || 'Failed to resume subscription' }
  }
  return { success: true }
}

/**
 * Pause billing collection for a subscription (admin only).
 */
export async function adminPauseSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  await verifyAdminAccess()

  const creds = await getStripeCredentials()
  if (!creds?.secretKey) return { success: false, error: 'Stripe not configured' }

  const resp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {
    'pause_collection[behavior]': 'keep_as_draft',
  }, 'POST')
  if (!resp.ok) {
    const err = await resp.json()
    return { success: false, error: err.error?.message || 'Failed to pause subscription' }
  }
  return { success: true }
}

/**
 * Unpause (resume billing) a paused subscription (admin only).
 */
export async function adminUnpauseSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  await verifyAdminAccess()

  const creds = await getStripeCredentials()
  if (!creds?.secretKey) return { success: false, error: 'Stripe not configured' }

  const resp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {
    'pause_collection': '',
  }, 'POST')
  if (!resp.ok) {
    const err = await resp.json()
    return { success: false, error: err.error?.message || 'Failed to unpause subscription' }
  }
  return { success: true }
}

/**
 * Récupère les URLs de téléchargement d'une facture Stripe.
 *
 * 4 stratégies de fallback (dans l'ordre) :
 *   1. stripeInvoiceId (in_xxx)   → GET /invoices/{id}                          (cas nominal)
 *   2. paymentIntentId = sub_xxx  → GET /invoices?subscription={id}&limit=1     (sub mal mappée en DB)
 *   3. paymentIntentId = pi_xxx   → GET /payment_intents/{id} → pi.invoice      (PI avec invoice liée)
 *   4. paymentIntentId = pi_xxx   → GET /charges?payment_intent={id}&limit=1    (PI legacy sans invoice → reçu)
 *
 * Si orderId est fourni, la DB est auto-corrigée (orders.stripe_invoice_id) quand trouvé via fallback 2/3.
 */
export async function getInvoicePdfUrl(
  stripeInvoiceId: string | null | undefined,
  paymentIntentId?: string | null,
  orderId?: string | null
): Promise<{
  success: boolean
  invoicePdf?: string
  hostedInvoiceUrl?: string
  isReceipt?: boolean   // true = reçu Stripe (legacy), pas une vraie facture PDF
  error?: string
}> {
  await verifyAdminAccess()

  const creds = await getStripeCredentials()
  if (!creds?.secretKey) {
    return { success: false, error: 'Stripe credentials not configured' }
  }

  const { db } = await import('@/db')
  const { orders } = await import('@/db/schema')
  const { eq } = await import('drizzle-orm')

  // Helper pour auto-corriger stripe_invoice_id en DB
  const fixInvoiceId = async (invoiceId: string) => {
    if (!orderId) return
    try {
      await db.update(orders).set({ stripeInvoiceId: invoiceId }).where(eq(orders.id, orderId))
    } catch { /* non bloquant */ }
  }

  // ── Stratégie 1 : stripeInvoiceId direct ──────────────────────────────────
  if (stripeInvoiceId) {
    const resp = await stripeFetch(creds.secretKey, `/invoices/${stripeInvoiceId}`)
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      return { success: false, error: (err as any)?.error?.message || 'Invoice not found in Stripe' }
    }
    const inv = await resp.json()
    return {
      success: true,
      invoicePdf: inv.invoice_pdf || undefined,
      hostedInvoiceUrl: inv.hosted_invoice_url || undefined,
    }
  }

  if (!paymentIntentId) {
    return { success: false, error: 'No Stripe identifier available for this order' }
  }

  // ── Stratégie 2 : sub_xxx mal mappé dans payment_intent_id ────────────────
  if (paymentIntentId.startsWith('sub_')) {
    const resp = await stripeFetch(
      creds.secretKey,
      `/invoices?subscription=${encodeURIComponent(paymentIntentId)}&limit=1`
    )
    if (resp.ok) {
      const data = await resp.json()
      const inv = data.data?.[0]
      if (inv) {
        await fixInvoiceId(inv.id)
        return {
          success: true,
          invoicePdf: inv.invoice_pdf || undefined,
          hostedInvoiceUrl: inv.hosted_invoice_url || undefined,
        }
      }
    }
    return { success: false, error: 'No invoice found for this subscription' }
  }

  // ── Stratégies 3 & 4 : pi_xxx ─────────────────────────────────────────────
  if (paymentIntentId.startsWith('pi_')) {
    const piResp = await stripeFetch(creds.secretKey, `/payment_intents/${paymentIntentId}`)
    if (!piResp.ok) {
      const err = await piResp.json().catch(() => ({}))
      return { success: false, error: (err as any)?.error?.message || 'Payment intent not found in Stripe' }
    }
    const pi = await piResp.json()

    // Stratégie 3 : PI avec invoice liée
    const invoiceId: string | null = typeof pi.invoice === 'string'
      ? pi.invoice
      : pi.invoice?.id ?? null

    if (invoiceId) {
      const invResp = await stripeFetch(creds.secretKey, `/invoices/${invoiceId}`)
      if (!invResp.ok) {
        const err = await invResp.json().catch(() => ({}))
        return { success: false, error: (err as any)?.error?.message || 'Invoice not found in Stripe' }
      }
      const inv = await invResp.json()
      await fixInvoiceId(inv.id)
      return {
        success: true,
        invoicePdf: inv.invoice_pdf || undefined,
        hostedInvoiceUrl: inv.hosted_invoice_url || undefined,
      }
    }

    // Stratégie 4 : PI direct sans invoice → reçu Stripe via charge
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id
    if (chargeId) {
      const chargeResp = await stripeFetch(creds.secretKey, `/charges/${chargeId}`)
      if (chargeResp.ok) {
        const charge = await chargeResp.json()
        if (charge.receipt_url) {
          return {
            success: true,
            hostedInvoiceUrl: charge.receipt_url,
            isReceipt: true,
          }
        }
      }
    }

    return {
      success: false,
      error: 'This payment has no Stripe invoice or receipt — it may have been created outside the Invoice API',
    }
  }

  return { success: false, error: 'Unrecognised Stripe identifier format' }
}
