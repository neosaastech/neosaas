/**
 * Test/simulation utilities for the checkout flow.
 * These helpers allow testing purchases without real payment processing.
 * (Previously named lago-test-mode; now Stripe-native.)
 */

import type { LagoTestModeResult } from './types'

function generateTestInvoiceId(): string {
  return `test_pi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

function generateTestInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `TEST-${year}${month}-${random}`
}

/**
 * Create a simulated invoice for testing purposes.
 */
export async function createTestInvoice(params: {
  customerId: string
  customerEmail: string
  customerName: string
  items: {
    description: string
    unitAmountCents: number
    quantity: number
  }[]
  currency: string
}): Promise<LagoTestModeResult> {
  const { items, currency } = params
  const totalAmount = items.reduce((sum, item) => sum + (item.unitAmountCents * item.quantity), 0)

  const result: LagoTestModeResult = {
    success: true,
    invoiceId: generateTestInvoiceId(),
    invoiceNumber: generateTestInvoiceNumber(),
    amount: totalAmount,
    currency,
    status: 'paid',
    testMode: true,
    message: 'Test mode: invoice automatically marked as paid',
  }

  console.log('[Checkout Test] Simulated invoice created:', {
    invoiceId: result.invoiceId,
    amount: `${(totalAmount / 100).toFixed(2)} ${currency}`,
  })

  return result
}

/**
 * Simulate a payment (test/dev mode only).
 */
export async function simulateTestPayment(invoiceId: string): Promise<{
  success: boolean
  transactionId: string
  paidAt: Date
}> {
  const transactionId = `test_txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  console.log('[Checkout Test] Payment simulated:', { invoiceId, transactionId })

  return { success: true, transactionId, paidAt: new Date() }
}

/**
 * Returns true if test mode should be used (no real payment processing).
 * In test mode, orders are marked paid without going through Stripe.
 */
export async function shouldUseTestMode(): Promise<boolean> {
  return process.env.NODE_ENV === 'development'
}

/**
 * Create a simulated customer (test/dev mode).
 */
export async function createTestCustomer(params: {
  externalId: string
  email: string
  name: string
}): Promise<{ stripeId: string; externalId: string }> {
  const stripeId = `test_cus_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  console.log('[Checkout Test] Simulated customer:', { stripeId, ...params })
  return { stripeId, externalId: params.externalId }
}
