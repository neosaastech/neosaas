import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeCredentials } from '@/lib/stripe'
import { savePaymentMethodToDB } from '@/lib/stripe-payment-methods'
import { db } from '@/db'
import { companies, paymentMethods, subscriptions, orders } from '@/db/schema'
import { eq, or } from 'drizzle-orm'
import { syncCompanyPaymentMethods } from '@/lib/stripe-sync'
import { logSystemEvent } from '@/app/actions/logs'

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhooks
 *
 * Events handled:
 * - payment_method.attached: New card added
 * - payment_method.detached: Card removed
 * - payment_method.updated: Card updated
 * - customer.updated: Customer info changed
 * - payment_intent.succeeded: Payment successful
 * - payment_intent.payment_failed: Payment failed
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] No signature provided')
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  try {
    // Get Stripe credentials
    const credentials = await getStripeCredentials(false)

    if (!credentials || !credentials.webhookSecret) {
      console.error('[Stripe Webhook] Webhook secret not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(credentials.secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })

    // Verify webhook signature
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        credentials.webhookSecret
      )
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod

        if (paymentMethod.customer) {
          // Find company by Stripe customer ID
          const company = await db.query.companies.findFirst({
            where: eq(companies.stripeCustomerId, paymentMethod.customer as string)
          })

          if (company) {
            console.log(`[Stripe Webhook] Saving new payment method for company ${company.id}`)
            await savePaymentMethodToDB(paymentMethod, company.id)
          }
        }
        break
      }

      case 'payment_method.detached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod

        // Mark as inactive in database
        await db
          .update(paymentMethods)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(paymentMethods.stripePaymentMethodId, paymentMethod.id))

        console.log(`[Stripe Webhook] Payment method ${paymentMethod.id} detached`)
        break
      }

      case 'payment_method.updated': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod

        if (paymentMethod.customer) {
          const company = await db.query.companies.findFirst({
            where: eq(companies.stripeCustomerId, paymentMethod.customer as string)
          })

          if (company) {
            console.log(`[Stripe Webhook] Updating payment method for company ${company.id}`)
            await savePaymentMethodToDB(paymentMethod, company.id)
          }
        }
        break
      }

      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer
        console.log(`[Stripe Webhook] Customer deleted: ${customer.id}`)

        const company = await db.query.companies.findFirst({
          where: eq(companies.stripeCustomerId, customer.id)
        })

        if (company) {
          // Deactivate all payment methods for this company
          await db
            .update(paymentMethods)
            .set({ isActive: false, isDefault: false, updatedAt: new Date() })
            .where(eq(paymentMethods.companyId, company.id))

          // Clear Stripe references on the company record
          await db
            .update(companies)
            .set({
              stripeCustomerId: null,
              stripeDefaultPaymentMethod: null,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, company.id))

          console.log(`[Stripe Webhook] Cleared Stripe data for company ${company.id} (${company.name})`)

          await logSystemEvent({
            category: 'stripe',
            level: 'warning',
            message: `Stripe customer deleted: ${customer.id} — company "${company.name}" unlinked`,
            metadata: { customerId: customer.id, companyId: company.id, companyName: company.name },
          }).catch(() => {})
        }
        break
      }

      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer

        // Find company and sync payment methods
        const company = await db.query.companies.findFirst({
          where: eq(companies.stripeCustomerId, customer.id)
        })

        if (company) {
          console.log(`[Stripe Webhook] Customer updated, syncing payment methods for company ${company.id}`)
          await syncCompanyPaymentMethods(company.id)

          // Update default payment method if changed
          const defaultPM = customer.invoice_settings?.default_payment_method

          if (defaultPM) {
            await db
              .update(companies)
              .set({
                stripeDefaultPaymentMethod: typeof defaultPM === 'string' ? defaultPM : defaultPM.id,
                updatedAt: new Date(),
              })
              .where(eq(companies.id, company.id))
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`[Stripe Webhook] Payment succeeded: ${paymentIntent.id}`)

        // Update matching order to "paid"
        const orderId = paymentIntent.metadata?.orderId
        if (orderId) {
          const existingOrder = await db.query.orders.findFirst({
            where: eq(orders.id, orderId)
          })
          if (existingOrder && existingOrder.paymentStatus !== 'paid') {
            await db.update(orders)
              .set({
                paymentStatus: 'paid',
                paymentIntentId: paymentIntent.id,
                paidAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(orders.id, orderId))
            console.log(`[Stripe Webhook] ✅ Order ${existingOrder.orderNumber} marked as paid`)
          }
        } else {
          // Fallback: try finding order by paymentIntentId
          const matchingOrder = await db.query.orders.findFirst({
            where: eq(orders.paymentIntentId, paymentIntent.id)
          })
          if (matchingOrder && matchingOrder.paymentStatus !== 'paid') {
            await db.update(orders)
              .set({
                paymentStatus: 'paid',
                paidAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(orders.id, matchingOrder.id))
            console.log(`[Stripe Webhook] ✅ Order ${matchingOrder.orderNumber} marked as paid (fallback lookup)`)
          }
        }

        await logSystemEvent({
          category: 'stripe',
          level: 'info',
          message: `Payment succeeded: ${paymentIntent.id} — ${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`,
          metadata: { paymentIntentId: paymentIntent.id, amount: paymentIntent.amount, currency: paymentIntent.currency, orderId },
        }).catch(() => {})
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`[Stripe Webhook] Payment failed: ${paymentIntent.id}`)

        // Update matching order to "failed"
        const failedOrderId = paymentIntent.metadata?.orderId
        if (failedOrderId) {
          await db.update(orders)
            .set({
              paymentStatus: 'failed',
              updatedAt: new Date()
            })
            .where(eq(orders.id, failedOrderId))
          console.log(`[Stripe Webhook] ❌ Order ${failedOrderId} marked as failed`)
        } else {
          // Fallback: try finding order by paymentIntentId
          const matchingOrder = await db.query.orders.findFirst({
            where: eq(orders.paymentIntentId, paymentIntent.id)
          })
          if (matchingOrder) {
            await db.update(orders)
              .set({
                paymentStatus: 'failed',
                updatedAt: new Date()
              })
              .where(eq(orders.id, matchingOrder.id))
            console.log(`[Stripe Webhook] ❌ Order ${matchingOrder.orderNumber} marked as failed (fallback lookup)`)
          }
        }

        await logSystemEvent({
          category: 'stripe',
          level: 'warning',
          message: `Payment failed: ${paymentIntent.id} — ${paymentIntent.last_payment_error?.message || 'Unknown reason'}`,
          metadata: { paymentIntentId: paymentIntent.id, error: paymentIntent.last_payment_error?.message, orderId: failedOrderId },
        }).catch(() => {})
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`[Stripe Webhook] Subscription ${event.type}: ${subscription.id}`)

        // Find company by Stripe customer ID
        const company = await db.query.companies.findFirst({
          where: eq(companies.stripeCustomerId, subscription.customer as string)
        })

        if (company) {
          // Upsert subscription record
          const existing = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, subscription.id)
          })

          const priceId = subscription.items.data[0]?.price?.id ?? ''
          const subData = {
            stripeSubscriptionId: subscription.id,
            customerId: company.id,
            stripePriceId: priceId,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000)
              : null,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: new Date(),
          }

          if (existing) {
            await db.update(subscriptions).set(subData).where(eq(subscriptions.stripeSubscriptionId, subscription.id))
          } else {
            await db.insert(subscriptions).values({ ...subData, createdAt: new Date() })
          }

          await logSystemEvent({
            category: 'stripe',
            level: 'info',
            message: `Subscription ${event.type === 'customer.subscription.created' ? 'created' : 'updated'}: ${subscription.id} (status: ${subscription.status})`,
            metadata: { subscriptionId: subscription.id, status: subscription.status, companyId: company.id },
          }).catch(() => {})
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`[Stripe Webhook] Subscription canceled: ${subscription.id}`)

        await db.update(subscriptions)
          .set({ status: 'canceled', updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

        await logSystemEvent({
          category: 'stripe',
          level: 'info',
          message: `Subscription canceled: ${subscription.id}`,
          metadata: { subscriptionId: subscription.id },
        }).catch(() => {})
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[Stripe Webhook] Invoice paid: ${invoice.id}`)

        // Find company by Stripe customer ID
        const company = invoice.customer
          ? await db.query.companies.findFirst({
              where: eq(companies.stripeCustomerId, invoice.customer as string)
            })
          : null

        if (company) {
          // Look up order associated with this invoice.
          // processCheckout stores the invoice ID in `paymentIntentId` (not orderNumber),
          // so we search both fields to avoid creating duplicates.
          const existing = await db.query.orders.findFirst({
            where: or(
              eq(orders.paymentIntentId, invoice.id),
              eq(orders.orderNumber, invoice.id)
            )
          })

          if (existing) {
            // Order exists (created by processCheckout) — ensure it is marked paid and PDF stored
            const updatePayload: Record<string, unknown> = {
              stripeInvoiceId: invoice.id,
              invoicePdf: invoice.invoice_pdf ?? null,
              hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
              taxAmount: (invoice as any).tax ?? null,
              updatedAt: new Date(),
            }
            if (existing.paymentStatus !== 'paid') {
              updatePayload.paymentStatus = 'paid'
              updatePayload.paidAt = new Date()
            }
            await db.update(orders).set(updatePayload).where(eq(orders.id, existing.id))
            if (existing.paymentStatus !== 'paid') {
              console.log(`[Stripe Webhook] ✅ Order ${existing.orderNumber} marked as paid via invoice ${invoice.id}`)
            } else {
              console.log(`[Stripe Webhook] ℹ Order ${existing.orderNumber} PDF URLs updated for invoice ${invoice.id}`)
            }
          } else {
            // Invoice not from our checkout (e.g., manual Stripe invoice) — create a new record
            await db.insert(orders).values({
              companyId: company.id,
              orderNumber: invoice.id,
              totalAmount: invoice.amount_paid,
              currency: invoice.currency,
              status: 'completed',
              paymentStatus: 'paid',
              paymentMethod: 'stripe',
              paymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id,
              stripeInvoiceId: invoice.id,
              invoicePdf: invoice.invoice_pdf ?? null,
              hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
              taxAmount: (invoice as any).tax ?? null,
              paidAt: new Date(invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : Date.now()),
            })
            console.log(`[Stripe Webhook] ✅ New order record created for manual invoice ${invoice.id}`)
          }

          await logSystemEvent({
            category: 'stripe',
            level: 'info',
            message: `Invoice paid: ${invoice.id} — ${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()} (company: ${company.name})`,
            metadata: { invoiceId: invoice.id, amountPaid: invoice.amount_paid, companyId: company.id },
          }).catch(() => {})
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[Stripe Webhook] Invoice payment failed: ${invoice.id}`)

        await logSystemEvent({
          category: 'stripe',
          level: 'warning',
          message: `Invoice payment failed: ${invoice.id}`,
          metadata: { invoiceId: invoice.id, customerId: invoice.customer },
        }).catch(() => {})
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({
      received: true,
      eventType: event.type,
    })
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
