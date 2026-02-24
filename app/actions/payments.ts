'use server'

import { getCurrentUser } from '@/lib/auth'
import { getStripeCredentials } from '@/lib/stripe'
import { db } from '@/db'
import { users, companies, paymentMethods } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { ensureStripeCustomer } from '@/lib/stripe-customers'

// ============================================================================
// Stripe REST API helper (no backend SDK — PCI-compliant via REST)
// ============================================================================

async function stripeFetch(
  secretKey: string,
  endpoint: string,
  params?: Record<string, string>,
  method: 'GET' | 'POST' | 'DELETE' = 'GET'
) {
  const url = method === 'GET' && params
    ? `https://api.stripe.com/v1${endpoint}?${new URLSearchParams(params)}`
    : `https://api.stripe.com/v1${endpoint}`

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }

  if (method === 'POST' && params) {
    options.body = new URLSearchParams(params).toString()
  }

  const response = await fetch(url, options)
  return response
}

/**
 * Retrieve the user's companyId from DB (bypasses stale JWT).
 */
async function getUserCompanyId(userId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { companyId: true },
  })
  return user?.companyId ?? null
}

/**
 * Get the Stripe customerId for the current user's company.
 * Uses ensureStripeCustomer so the customer is created if missing.
 * Returns null if the user has no company.
 */
async function getCompanyStripeCustomerId(userId: string): Promise<string | null> {
  const companyId = await getUserCompanyId(userId)
  if (!companyId) return null
  const { customerId } = await ensureStripeCustomer(companyId)
  return customerId
}

// ============================================================================
// Create a Stripe SetupIntent for adding a card (frontend Elements)
// ============================================================================

export async function createStripeSetupIntent(): Promise<{
  success: boolean
  clientSecret?: string
  publishableKey?: string
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe credentials not configured. Please add Stripe API keys in Admin > API Management.' }
    }

    if (!creds.publishableKey) {
      return { success: false, error: 'Stripe publishable key not configured. Please add it in Admin > API Management.' }
    }

    // Customer is always the COMPANY — never the individual user
    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) {
      return { success: false, error: 'Your account is not associated with a company. Please contact your administrator.' }
    }

    const companyId = await getUserCompanyId(user.userId)

    const response = await stripeFetch(creds.secretKey, '/setup_intents', {
      customer: customerId,
      'payment_method_types[]': 'card',
      'metadata[neosaas_company_id]': companyId ?? '',
      'metadata[added_by_user_id]': user.userId,
    }, 'POST')

    if (!response.ok) {
      const errData = await response.json()
      return { success: false, error: errData.error?.message || 'Failed to create setup intent' }
    }

    const data = await response.json()

    return {
      success: true,
      clientSecret: data.client_secret,
      publishableKey: creds.publishableKey,
    }
  } catch (error) {
    console.error('[Payments/Stripe] SetupIntent error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================================================
// List saved payment methods (cards) from Stripe
// ============================================================================

export async function getStripePaymentMethods(): Promise<{
  success: boolean
  cards?: Array<{
    id: string
    brand: string
    last4: string
    exp_month: number
    exp_year: number
    is_default: boolean
  }>
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: true, cards: [] }
    }

    // Always look up the COMPANY's Stripe customer — never the individual user
    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) {
      return { success: true, cards: [] }
    }

    // Get customer to check default payment method
    const customerResp = await stripeFetch(creds.secretKey, `/customers/${customerId}`, undefined, 'GET')
    let defaultPmId: string | null = null
    if (customerResp.ok) {
      const customerData = await customerResp.json()
      defaultPmId = customerData.invoice_settings?.default_payment_method || customerData.default_source
    }

    // List payment methods attached to the company customer
    const pmResp = await stripeFetch(creds.secretKey, '/payment_methods', {
      customer: customerId,
      type: 'card',
      limit: '10',
    }, 'GET')

    if (!pmResp.ok) {
      return { success: true, cards: [] }
    }

    const pmData = await pmResp.json()
    const cards = (pmData.data || []).map((pm: any) => ({
      id: pm.id,
      brand: pm.card?.brand || 'card',
      last4: pm.card?.last4 || '????',
      exp_month: pm.card?.exp_month || 0,
      exp_year: pm.card?.exp_year || 0,
      is_default: pm.id === defaultPmId,
    }))

    return { success: true, cards }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to fetch payment methods:', error)
    return { success: false, error: 'Failed to fetch payment methods' }
  }
}

// ============================================================================
// List invoices from Stripe
// ============================================================================

export async function getInvoices(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: true, data: [] }
    }

    // Use the COMPANY's Stripe customer — invoices are billed to the company
    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) {
      return { success: true, data: [] }
    }

    const invoicesResp = await stripeFetch(creds.secretKey, '/invoices', {
      customer: customerId,
      limit: '10',
    }, 'GET')

    if (!invoicesResp.ok) {
      return { success: true, data: [] }
    }

    const invoicesData = await invoicesResp.json()
    return { success: true, data: invoicesData.data || [] }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to fetch invoices:', error)
    return { success: false, error: 'Failed to fetch invoices' }
  }
}

// ============================================================================
// Get hosted invoice URL for paying an outstanding invoice
// ============================================================================

export async function getInvoiceCheckoutUrl(invoiceId: string): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    const invoiceResp = await stripeFetch(creds.secretKey, `/invoices/${invoiceId}`, undefined, 'GET')

    if (!invoiceResp.ok) {
      return { success: false, error: 'Invoice not found' }
    }

    const invoiceData = await invoiceResp.json()
    const url = invoiceData.hosted_invoice_url

    if (!url) {
      return { success: false, error: 'No payment URL available for this invoice' }
    }

    return { success: true, url }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to get invoice URL:', error)
    return { success: false, error: 'Failed to get payment URL' }
  }
}

// ============================================================================
// Delete a payment method from Stripe
// ============================================================================

export async function deleteStripePaymentMethod(paymentMethodId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    // Verify the payment method belongs to this user's customer
    const pmResp = await stripeFetch(creds.secretKey, `/payment_methods/${paymentMethodId}`, undefined, 'GET')
    if (!pmResp.ok) {
      return { success: false, error: 'Payment method not found' }
    }

    const pmData = await pmResp.json()
    const pmCustomerId = pmData.customer

    // Verify the payment method belongs to the user's COMPANY customer
    if (pmCustomerId) {
      const companyCid = await getCompanyStripeCustomerId(user.userId)
      if (companyCid && pmCustomerId !== companyCid) {
        return { success: false, error: 'Not authorized to delete this payment method' }
      }
    }

    const detachResp = await stripeFetch(
      creds.secretKey,
      `/payment_methods/${paymentMethodId}/detach`,
      {},
      'POST'
    )

    if (!detachResp.ok) {
      const errData = await detachResp.json()
      return { success: false, error: errData.error?.message || 'Failed to delete' }
    }

    // Also soft-delete from our DB (mark inactive) to keep payment_methods table in sync
    const companyId = await getUserCompanyId(user.userId)
    if (companyId) {
      await db
        .update(paymentMethods)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(paymentMethods.stripePaymentMethodId, paymentMethodId),
            eq(paymentMethods.companyId, companyId)
          )
        )
    }

    return { success: true }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to delete payment method:', error)
    return { success: false, error: 'Failed to delete payment method' }
  }
}

// ============================================================================
// Set a payment method as default
// ============================================================================

export async function setDefaultPaymentMethod(paymentMethodId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    // Set the default on the COMPANY's customer
    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) {
      return { success: false, error: 'No company customer found' }
    }

    const resp = await stripeFetch(creds.secretKey, `/customers/${customerId}`, {
      'invoice_settings[default_payment_method]': paymentMethodId,
    }, 'POST')

    if (!resp.ok) {
      const errData = await resp.json()
      return { success: false, error: errData.error?.message || 'Failed to set default' }
    }

    return { success: true }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to set default payment method:', error)
    return { success: false, error: 'Failed to set default payment method' }
  }
}

// ============================================================================
// Create a Stripe Checkout Session for a one-time payment
// ============================================================================

export async function createStripeCheckoutSession(params: {
  priceId?: string
  amountCents?: number
  currency?: string
  description?: string
  successUrl: string
  cancelUrl: string
}): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    // Checkout Session is billed to the COMPANY's Stripe customer
    const customerId = await getCompanyStripeCustomerId(user.userId)

    const sessionParams: Record<string, string> = {
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      'payment_method_types[]': 'card',
    }

    if (customerId) {
      sessionParams.customer = customerId
    } else {
      sessionParams.customer_email = user.email
    }

    if (params.priceId) {
      sessionParams['line_items[0][price]'] = params.priceId
      sessionParams['line_items[0][quantity]'] = '1'
    } else if (params.amountCents) {
      sessionParams['line_items[0][price_data][currency]'] = params.currency || 'eur'
      sessionParams['line_items[0][price_data][unit_amount]'] = String(params.amountCents)
      sessionParams['line_items[0][price_data][product_data][name]'] = params.description || 'Payment'
      sessionParams['line_items[0][quantity]'] = '1'
    }

    const resp = await stripeFetch(creds.secretKey, '/checkout/sessions', sessionParams, 'POST')

    if (!resp.ok) {
      const errData = await resp.json()
      return { success: false, error: errData.error?.message || 'Failed to create checkout session' }
    }

    const data = await resp.json()
    return { success: true, url: data.url }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to create checkout session:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================================================
// Create a Stripe subscription
// ============================================================================

export async function createStripeSubscription(params: {
  stripePriceId: string
  trialDays?: number
}): Promise<{
  success: boolean
  subscriptionId?: string
  clientSecret?: string
  status?: string
  currentPeriodEnd?: number
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    // Subscription is billed to the COMPANY's Stripe customer
    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) {
      return { success: false, error: 'Your account is not associated with a company. Please contact your administrator.' }
    }

    const subParams: Record<string, string> = {
      customer: customerId,
      'items[0][price]': params.stripePriceId,
      'payment_behavior': 'default_incomplete',
      'expand[]': 'latest_invoice.payment_intent',
    }

    if (params.trialDays) {
      subParams.trial_period_days = String(params.trialDays)
    }

    const resp = await stripeFetch(creds.secretKey, '/subscriptions', subParams, 'POST')

    if (!resp.ok) {
      const errData = await resp.json()
      return { success: false, error: errData.error?.message || 'Failed to create subscription' }
    }

    const data = await resp.json()
    return {
      success: true,
      subscriptionId: data.id,
      clientSecret: data.latest_invoice?.payment_intent?.client_secret,
      status: data.status,
      currentPeriodEnd: data.current_period_end,
    }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to create subscription:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================================================
// Create a Stripe Invoice payment (one-time purchase with proper invoice PDF)
// ============================================================================

/**
 * Creates InvoiceItems + Invoice + pays it via the company's default card.
 * This is preferred over bare PaymentIntents because it generates a proper
 * Stripe invoice with a PDF, visible in /invoices API and the Stripe dashboard.
 */
export async function createStripeInvoicePayment(params: {
  items: Array<{
    description: string
    amount: number   // total for this line in cents (quantity × unit_amount)
    currency: string
    quantity: number
  }>
  orderId: string
  orderNumber: string
  description?: string
}): Promise<{
  success: boolean
  invoiceId?: string
  invoicePdfUrl?: string
  hostedInvoiceUrl?: string
  paymentIntentId?: string
  status?: string
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    // Use the COMPANY's Stripe customer
    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) {
      return { success: false, error: 'Your account is not associated with a company. Please contact your administrator.' }
    }

    // Create one InvoiceItem per cart line
    for (const item of params.items) {
      // Stripe invoiceitems: use unit_amount + quantity (never amount + quantity together)
      const unitAmount = item.quantity > 0 ? Math.round(item.amount / item.quantity) : item.amount
      const invoiceItemParams: Record<string, string> = {
        customer: customerId,
        unit_amount: String(unitAmount),
        quantity: String(item.quantity || 1),
        currency: (item.currency || 'eur').toLowerCase(),
        description: item.description,
        'metadata[order_id]': params.orderId,
        'metadata[order_number]': params.orderNumber,
      }
      const iiResp = await stripeFetch(creds.secretKey, '/invoiceitems', invoiceItemParams, 'POST')
      if (!iiResp.ok) {
        const errData = await iiResp.json()
        return { success: false, error: `Failed to create invoice item: ${errData.error?.message}` }
      }
    }

    // Create the Invoice (pending items above are automatically included)
    const invoiceParams: Record<string, string> = {
      customer: customerId,
      auto_advance: 'false', // we finalize manually
      collection_method: 'charge_automatically',
      'metadata[order_id]': params.orderId,
      'metadata[order_number]': params.orderNumber,
    }
    if (params.description) {
      invoiceParams.description = params.description
    }

    const invResp = await stripeFetch(creds.secretKey, '/invoices', invoiceParams, 'POST')
    if (!invResp.ok) {
      const errData = await invResp.json()
      return { success: false, error: `Failed to create invoice: ${errData.error?.message}` }
    }
    const invoice = await invResp.json()
    const invoiceId: string = invoice.id

    // Finalize the invoice (locks amounts, generates PDF, invoice number)
    const finalResp = await stripeFetch(creds.secretKey, `/invoices/${invoiceId}/finalize`, {}, 'POST')
    if (!finalResp.ok) {
      const errData = await finalResp.json()
      return { success: false, error: `Failed to finalize invoice: ${errData.error?.message}` }
    }
    const finalizedInvoice = await finalResp.json()

    // Pay the invoice via the customer's default payment method
    const payResp = await stripeFetch(creds.secretKey, `/invoices/${invoiceId}/pay`, {}, 'POST')
    if (!payResp.ok) {
      const errData = await payResp.json()
      // Invoice exists but payment failed — return invoiceId so it can be stored and retried
      return {
        success: false,
        invoiceId,
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
        error: errData.error?.message || 'Payment failed',
      }
    }
    const paidInvoice = await payResp.json()

    return {
      success: true,
      invoiceId: paidInvoice.id,
      invoicePdfUrl: paidInvoice.invoice_pdf,
      hostedInvoiceUrl: paidInvoice.hosted_invoice_url,
      paymentIntentId: paidInvoice.payment_intent,
      status: paidInvoice.status, // 'paid' | 'open' | 'draft'
    }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to create invoice payment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================================================
// Subscription management (list, cancel, resume, pause)
// ============================================================================

/**
 * List all Stripe subscriptions for the current user's company.
 * Returns enriched subscription objects from the Stripe API.
 */
export async function getCompanySubscriptions(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: true, data: [] }
    }

    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) {
      return { success: true, data: [] }
    }

    const resp = await stripeFetch(creds.secretKey, '/subscriptions', {
      customer: customerId,
      limit: '20',
      'expand[]': 'data.latest_invoice',
    }, 'GET')

    if (!resp.ok) {
      return { success: true, data: [] }
    }

    const data = await resp.json()
    return { success: true, data: data.data || [] }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to get subscriptions:', error)
    return { success: false, error: 'Failed to fetch subscriptions' }
  }
}

/**
 * Cancel a subscription.
 * @param immediately  true = cancel now, false (default) = cancel at period end
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    // Verify this subscription belongs to the user's company
    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) {
      return { success: false, error: 'No company customer found' }
    }

    const subResp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, undefined, 'GET')
    if (!subResp.ok) return { success: false, error: 'Subscription not found' }
    const sub = await subResp.json()
    if (sub.customer !== customerId) {
      return { success: false, error: 'Unauthorized: subscription does not belong to your company' }
    }

    if (immediately) {
      // DELETE = immediate cancellation
      const delResp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {}, 'DELETE')
      if (!delResp.ok) {
        const err = await delResp.json()
        return { success: false, error: err.error?.message || 'Failed to cancel subscription' }
      }
    } else {
      // cancel_at_period_end = cancel gracefully
      const updResp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {
        cancel_at_period_end: 'true',
      }, 'POST')
      if (!updResp.ok) {
        const err = await updResp.json()
        return { success: false, error: err.error?.message || 'Failed to schedule cancellation' }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to cancel subscription:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Resume a subscription that was set to cancel at period end.
 * Removes the cancel_at_period_end flag.
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) {
      return { success: false, error: 'No company customer found' }
    }

    const subResp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, undefined, 'GET')
    if (!subResp.ok) return { success: false, error: 'Subscription not found' }
    const sub = await subResp.json()
    if (sub.customer !== customerId) {
      return { success: false, error: 'Unauthorized' }
    }

    const updResp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {
      cancel_at_period_end: 'false',
    }, 'POST')

    if (!updResp.ok) {
      const err = await updResp.json()
      return { success: false, error: err.error?.message || 'Failed to resume subscription' }
    }

    return { success: true }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to resume subscription:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Pause billing collection for a subscription (keeps it active but stops charging).
 */
export async function pauseSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) return { success: false, error: 'No company customer found' }

    const subResp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, undefined, 'GET')
    if (!subResp.ok) return { success: false, error: 'Subscription not found' }
    const sub = await subResp.json()
    if (sub.customer !== customerId) return { success: false, error: 'Unauthorized' }

    const updResp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {
      'pause_collection[behavior]': 'keep_as_draft',
    }, 'POST')

    if (!updResp.ok) {
      const err = await updResp.json()
      return { success: false, error: err.error?.message || 'Failed to pause subscription' }
    }

    return { success: true }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to pause subscription:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Unpause (resume billing collection for) a paused subscription.
 */
export async function unpauseSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const creds = await getStripeCredentials()
    if (!creds || !creds.secretKey) {
      return { success: false, error: 'Stripe not configured' }
    }

    const customerId = await getCompanyStripeCustomerId(user.userId)
    if (!customerId) return { success: false, error: 'No company customer found' }

    const subResp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, undefined, 'GET')
    if (!subResp.ok) return { success: false, error: 'Subscription not found' }
    const sub = await subResp.json()
    if (sub.customer !== customerId) return { success: false, error: 'Unauthorized' }

    // Send empty string to clear pause_collection
    const updResp = await stripeFetch(creds.secretKey, `/subscriptions/${subscriptionId}`, {
      'pause_collection': '',
    }, 'POST')

    if (!updResp.ok) {
      const err = await updResp.json()
      return { success: false, error: err.error?.message || 'Failed to unpause subscription' }
    }

    return { success: true }
  } catch (error) {
    console.error('[Payments/Stripe] Failed to unpause subscription:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
