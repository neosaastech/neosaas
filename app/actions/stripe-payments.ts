'use server'

/**
 * Stripe Payment Actions
 * Server actions for managing Stripe payments and payment methods
 * Used by frontend components to interact with Stripe
 *
 * Access rules:
 *   - Read (getCompanyCards)            → any authenticated member of the company
 *   - Write (add / remove / default / sync) → writer, admin, super_admin
 *   - Admin sync (all companies)        → admin, super_admin only
 */

import { getCurrentUser } from '@/lib/auth'
import { hasRole } from '@/lib/auth/server'
import { db } from '@/db'
import { companies, paymentMethods, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import Stripe from 'stripe'
import { getStripeCredentials } from '@/lib/stripe'
import {
  ensureStripeCustomer,
  updateStripeCustomerMetadata,
} from '@/lib/stripe-customers'
import {
  createSetupIntent,
  getCompanyPaymentMethodsFromDB,
  setDefaultPaymentMethod,
  detachPaymentMethod,
  savePaymentMethodToDB,
  getPaymentMethod,
  updatePaymentMethodMetadata,
} from '@/lib/stripe-payment-methods'
import {
  syncCompanyPaymentMethods,
  syncAllCompanies,
} from '@/lib/stripe-sync'

// ============================================================================
// Role constants
// ============================================================================

/** Minimum role required to manage (write) payment methods */
const WRITER_ROLES = ['writer', 'admin', 'super_admin']

/** Minimum role required for platform-wide operations */
const ADMIN_ROLES = ['admin', 'super_admin']

// ============================================================================
// Helper Functions
// ============================================================================

async function getStripeClient(): Promise<Stripe> {
  const credentials = await getStripeCredentials(false)

  if (!credentials || !credentials.secretKey) {
    throw new Error('Stripe credentials not configured')
  }

  return new Stripe(credentials.secretKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  })
}

/**
 * Fetch the full name and email of a user from the database.
 * Used to enrich Stripe metadata with the writer's identity.
 */
async function getWriterInfo(
  userId: string,
  jwtEmail: string
): Promise<{ userName: string; userEmail: string }> {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { firstName: true, lastName: true, email: true },
  })
  const userName = dbUser
    ? `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim()
    : ''
  return { userName, userEmail: dbUser?.email ?? jwtEmail }
}

/**
 * Get user's company ID freshly from the database (bypasses potentially stale JWT).
 * Falls back to the JWT companyId if the DB record has no companyId yet.
 */
async function getUserCompanyIdFromDB(userId: string): Promise<string | null> {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { companyId: true },
  })
  return dbUser?.companyId ?? null
}

// ============================================================================
// Payment Methods Management
// ============================================================================

/**
 * Get all payment methods (cards) for the user's company
 */
export async function getCompanyCards() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!user.companyId) {
      return { success: false, error: 'User is not associated with a company' }
    }

    const cards = await getCompanyPaymentMethodsFromDB(user.companyId)

    return {
      success: true,
      data: cards,
    }
  } catch (error) {
    console.error('[Stripe Payments] Failed to get company cards:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment methods',
    }
  }
}

/**
 * Create a setup intent to add a new payment method
 * Requires writer role or above.
 */
export async function createCardSetupIntent() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!user.companyId) {
      return { success: false, error: 'User is not associated with a company' }
    }

    const canWrite = await hasRole(user.userId, WRITER_ROLES)
    if (!canWrite) {
      return { success: false, error: 'Insufficient permissions: writer role required' }
    }

    // Fetch writer's full name so Stripe shows who initiated the card setup
    const { userName, userEmail } = await getWriterInfo(user.userId, user.email)

    const { setupIntentId, clientSecret } = await createSetupIntent(
      user.companyId,
      user.userId,
      userName,
      userEmail,
    )

    return {
      success: true,
      data: {
        setupIntentId,
        clientSecret,
      },
    }
  } catch (error) {
    console.error('[Stripe Payments] Failed to create setup intent:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create setup intent',
    }
  }
}

/**
 * Confirm a payment method was added successfully
 * This is called after Stripe Elements completes the setup.
 * Requires writer role or above.
 */
export async function confirmPaymentMethodAdded(paymentMethodId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const canWrite = await hasRole(user.userId, WRITER_ROLES)
    if (!canWrite) {
      return { success: false, error: 'Insufficient permissions: writer role required' }
    }

    // Load companyId fresh from DB to avoid stale JWT sessions
    // (JWT may have been issued before the user was associated with a company)
    const companyId = await getUserCompanyIdFromDB(user.userId) ?? user.companyId
    if (!companyId) {
      return { success: false, error: 'User is not associated with a company' }
    }

    // Get the payment method from Stripe
    const stripePaymentMethod = await getPaymentMethod(paymentMethodId)

    // Save to database
    const saved = await savePaymentMethodToDB(stripePaymentMethod, companyId, user.userId)

    // Set as default if it is the first card or if there is currently no default
    const existingCards = await getCompanyPaymentMethodsFromDB(companyId)
    const hasDefault = existingCards.some(
      c => c.isDefault && c.stripePaymentMethodId !== paymentMethodId
    )
    if (existingCards.length === 1 || !hasDefault) {
      await setDefaultPaymentMethod(companyId, paymentMethodId)
    }

    // Stamp the Stripe payment method with the writer's identity and company name
    // so Stripe's dashboard shows who registered the card and for which company.
    const { userName, userEmail } = await getWriterInfo(user.userId, user.email)
    await updatePaymentMethodMetadata(paymentMethodId, companyId, {
      userId: user.userId,
      userName,
      userEmail,
    })

    // Clear the setup intent client secret
    await db
      .update(companies)
      .set({
        stripeSetupIntentClientSecret: null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))

    return {
      success: true,
      data: saved,
    }
  } catch (error) {
    console.error('[Stripe Payments] Failed to confirm payment method:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save payment method',
    }
  }
}

/**
 * Remove a payment method (card).
 * Requires writer role or above.
 */
export async function removePaymentMethod(paymentMethodId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!user.companyId) {
      return { success: false, error: 'User is not associated with a company' }
    }

    const canWrite = await hasRole(user.userId, WRITER_ROLES)
    if (!canWrite) {
      return { success: false, error: 'Insufficient permissions: writer role required' }
    }

    // Verify the payment method belongs to the user's company
    const method = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.stripePaymentMethodId, paymentMethodId),
        eq(paymentMethods.companyId, user.companyId)
      )
    })

    if (!method) {
      return { success: false, error: 'Payment method not found' }
    }

    await detachPaymentMethod(paymentMethodId, user.companyId)

    return { success: true }
  } catch (error) {
    console.error('[Stripe Payments] Failed to remove payment method:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove payment method',
    }
  }
}

/**
 * Set a card as the default payment method.
 * Requires writer role or above.
 */
export async function setDefaultCard(paymentMethodId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!user.companyId) {
      return { success: false, error: 'User is not associated with a company' }
    }

    const canWrite = await hasRole(user.userId, WRITER_ROLES)
    if (!canWrite) {
      return { success: false, error: 'Insufficient permissions: writer role required' }
    }

    // Verify the payment method belongs to the user's company
    const method = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.stripePaymentMethodId, paymentMethodId),
        eq(paymentMethods.companyId, user.companyId)
      )
    })

    if (!method) {
      return { success: false, error: 'Payment method not found' }
    }

    await setDefaultPaymentMethod(user.companyId, paymentMethodId)

    return { success: true }
  } catch (error) {
    console.error('[Stripe Payments] Failed to set default card:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set default payment method',
    }
  }
}

// ============================================================================
// Payment Processing
// ============================================================================

/**
 * @deprecated Ne plus utiliser — flux PaymentIntent direct abandonné le 16 fév. 2026.
 * Utiliser `createStripeInvoicePayment` dans `app/actions/payments.ts` à la place.
 * Cette fonction crée un PaymentIntent nu (sans facture) et n'est plus appelée
 * par le checkout. Elle est conservée temporairement pour ne pas casser d'éventuels
 * imports existants, mais sera supprimée dans une prochaine version.
 *
 * @see app/actions/payments.ts — createStripeInvoicePayment
 */
export async function createStripePayment(params: {
  amount: number // Amount in cents
  currency?: string
  description?: string
  metadata?: Record<string, string>
  useDefaultCard?: boolean
  paymentMethodId?: string
}) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!user.companyId) {
      return { success: false, error: 'User is not associated with a company' }
    }

    // Ensure company has a Stripe customer
    const { customerId } = await ensureStripeCustomer(user.companyId)

    const stripe = await getStripeClient()

    // Get payment method
    let paymentMethodId = params.paymentMethodId

    if (!paymentMethodId && params.useDefaultCard !== false) {
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, user.companyId)
      })

      paymentMethodId = company?.stripeDefaultPaymentMethod || undefined
    }

    if (!paymentMethodId) {
      return {
        success: false,
        error: 'No payment method available. Please add a card first.',
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency || 'eur',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      description: params.description,
      metadata: {
        neosaas_company_id: user.companyId,
        neosaas_user_id: user.userId,
        ...params.metadata,
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments`,
    })

    return {
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    }
  } catch (error) {
    console.error('[Stripe Payments] Failed to create payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payment',
    }
  }
}

// ============================================================================
// Synchronization
// ============================================================================

/**
 * Manually sync payment methods from Stripe for the user's company.
 * Requires writer role or above.
 */
export async function syncPaymentMethods() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!user.companyId) {
      return { success: false, error: 'User is not associated with a company' }
    }

    const canWrite = await hasRole(user.userId, WRITER_ROLES)
    if (!canWrite) {
      return { success: false, error: 'Insufficient permissions: writer role required' }
    }

    const result = await syncCompanyPaymentMethods(user.companyId)

    return {
      success: result.status === 'success' || result.status === 'partial',
      data: result,
    }
  } catch (error) {
    console.error('[Stripe Payments] Failed to sync payment methods:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync payment methods',
    }
  }
}

/**
 * Admin: Sync all companies.
 * Requires admin or super_admin role.
 */
export async function syncAllCompaniesPaymentMethods() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const canAdmin = await hasRole(user.userId, ADMIN_ROLES)
    if (!canAdmin) {
      return { success: false, error: 'Insufficient permissions: admin role required' }
    }

    const results = await syncAllCompanies()

    return {
      success: true,
      data: results,
    }
  } catch (error) {
    console.error('[Stripe Payments] Failed to sync all companies:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync companies',
    }
  }
}

// ============================================================================
// Customer Management
// ============================================================================

/**
 * Ensure user's company has a Stripe customer
 */
export async function ensureCompanyStripeCustomer() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!user.companyId) {
      return { success: false, error: 'User is not associated with a company' }
    }

    const { customerId, created } = await ensureStripeCustomer(user.companyId)

    return {
      success: true,
      data: {
        customerId,
        created,
      },
    }
  } catch (error) {
    console.error('[Stripe Payments] Failed to ensure customer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Stripe customer',
    }
  }
}

/**
 * Update company Stripe customer metadata
 */
export async function updateCompanyStripeMetadata() {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!user.companyId) {
      return { success: false, error: 'User is not associated with a company' }
    }

    await updateStripeCustomerMetadata(user.companyId, true)

    return { success: true }
  } catch (error) {
    console.error('[Stripe Payments] Failed to update metadata:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update customer metadata',
    }
  }
}
