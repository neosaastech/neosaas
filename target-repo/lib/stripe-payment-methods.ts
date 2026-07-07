/**
 * Stripe Payment Methods Management
 * Manages payment methods (cards) for companies
 * Handles creation, retrieval, deletion, and setting default cards
 */

import Stripe from 'stripe'
import { db } from '@/db'
import { companies, paymentMethods, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getStripeCredentials } from '@/lib/stripe'
import { ensureStripeCustomer } from '@/lib/stripe-customers'

/**
 * Get or initialize Stripe client
 */
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
 * Get all payment methods for a company from Stripe API
 */
export async function getCompanyPaymentMethodsFromStripe(
  companyId: string
): Promise<Stripe.PaymentMethod[]> {
  console.log(`[Stripe Payment Methods] Fetching payment methods for company ${companyId}`)

  // Ensure company has a Stripe customer
  const { customerId } = await ensureStripeCustomer(companyId)

  const stripe = await getStripeClient()

  // Fetch all payment methods for the customer
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
    limit: 100,
  })

  console.log(`[Stripe Payment Methods] Found ${paymentMethods.data.length} payment methods`)

  return paymentMethods.data
}

/**
 * Get all payment methods for a company from database
 */
export async function getCompanyPaymentMethodsFromDB(
  companyId: string
): Promise<typeof paymentMethods.$inferSelect[]> {
  const methods = await db.query.paymentMethods.findMany({
    where: and(
      eq(paymentMethods.companyId, companyId),
      eq(paymentMethods.isActive, true)
    ),
    orderBy: (methods, { desc }) => [desc(methods.isDefault), desc(methods.createdAt)],
  })

  return methods
}

/**
 * Create a Setup Intent for adding a new card.
 * Embeds company name and writer (user) identity in the metadata so Stripe's
 * dashboard shows who initiated the card setup and for which company.
 */
export async function createSetupIntent(
  companyId: string,
  userId?: string,
  userFullName?: string,
  userEmail?: string,
): Promise<{
  setupIntentId: string
  clientSecret: string
}> {
  console.log(`[Stripe Payment Methods] Creating setup intent for company ${companyId}`)

  // Ensure company has a Stripe customer
  const { customerId } = await ensureStripeCustomer(companyId)

  // Fetch company name for metadata enrichment
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { name: true },
  })

  const stripe = await getStripeClient()

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    metadata: {
      neosaas_company_id: companyId,
      company_name: company?.name || '',
      added_by_user_id: userId || '',
      added_by_user_name: userFullName || '',
      added_by_user_email: userEmail || '',
    },
  })

  // Store client secret temporarily in company table
  await db
    .update(companies)
    .set({
      stripeSetupIntentClientSecret: setupIntent.client_secret,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))

  console.log(`[Stripe Payment Methods] Setup intent created: ${setupIntent.id}`)

  return {
    setupIntentId: setupIntent.id,
    clientSecret: setupIntent.client_secret!,
  }
}

/**
 * Update a Stripe payment method's metadata with the writer who registered
 * or last modified it, and the associated company name.
 *
 * This information is visible directly in Stripe's dashboard under the
 * payment method detail view.
 */
export async function updatePaymentMethodMetadata(
  paymentMethodId: string,
  companyId: string,
  writerInfo: { userId: string; userName: string; userEmail: string }
): Promise<void> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { name: true },
  })

  const stripe = await getStripeClient()

  await stripe.paymentMethods.update(paymentMethodId, {
    metadata: {
      neosaas_company_id: companyId,
      company_name: company?.name || '',
      added_by_user_id: writerInfo.userId,
      added_by_user_name: writerInfo.userName,
      added_by_user_email: writerInfo.userEmail,
    },
  })

  // Reflect the metadata update time locally
  await db
    .update(paymentMethods)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(paymentMethods.stripePaymentMethodId, paymentMethodId),
      eq(paymentMethods.companyId, companyId)
    ))

  console.log(
    `[Stripe Payment Methods] Metadata updated — PM: ${paymentMethodId}, ` +
    `writer: "${writerInfo.userName}" (${writerInfo.userEmail}), ` +
    `company: "${company?.name}"`
  )
}

/**
 * Attach a payment method to a customer
 * (Usually done automatically by Stripe Elements, but available for manual operations)
 */
export async function attachPaymentMethod(
  paymentMethodId: string,
  companyId: string
): Promise<Stripe.PaymentMethod> {
  console.log(`[Stripe Payment Methods] Attaching payment method ${paymentMethodId} to company ${companyId}`)

  const { customerId } = await ensureStripeCustomer(companyId)
  const stripe = await getStripeClient()

  const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  })

  console.log(`[Stripe Payment Methods] Payment method attached successfully`)

  return paymentMethod
}

/**
 * Detach a payment method from a customer (remove card).
 * If the removed card was the default, the next available active card is
 * automatically promoted as the new default (both in Stripe and locally).
 */
export async function detachPaymentMethod(
  paymentMethodId: string,
  companyId: string
): Promise<void> {
  console.log(`[Stripe Payment Methods] Detaching payment method ${paymentMethodId}`)

  // Read the card before detaching so we know if it was the default
  const existingMethod = await db.query.paymentMethods.findFirst({
    where: and(
      eq(paymentMethods.stripePaymentMethodId, paymentMethodId),
      eq(paymentMethods.companyId, companyId)
    ),
  })

  const stripe = await getStripeClient()

  // Detach from Stripe
  await stripe.paymentMethods.detach(paymentMethodId)

  // Mark as inactive and clear the default flag in database
  await db
    .update(paymentMethods)
    .set({
      isActive: false,
      isDefault: false,
      updatedAt: new Date(),
    })
    .where(and(
      eq(paymentMethods.stripePaymentMethodId, paymentMethodId),
      eq(paymentMethods.companyId, companyId)
    ))

  console.log(`[Stripe Payment Methods] Payment method detached successfully`)

  // If the removed card was the default, promote the next available active card
  if (existingMethod?.isDefault) {
    const nextCard = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.companyId, companyId),
        eq(paymentMethods.isActive, true)
      ),
      orderBy: (pm, { desc }) => [desc(pm.createdAt)],
    })

    if (nextCard) {
      console.log(`[Stripe Payment Methods] Promoting ${nextCard.stripePaymentMethodId} as new default`)
      await setDefaultPaymentMethod(companyId, nextCard.stripePaymentMethodId)
    } else {
      // No remaining cards — clear the default reference on the company
      await db
        .update(companies)
        .set({ stripeDefaultPaymentMethod: null, updatedAt: new Date() })
        .where(eq(companies.id, companyId))

      console.log(`[Stripe Payment Methods] No remaining active cards — company default cleared`)
    }
  }
}

/**
 * Set a payment method as default for a company
 */
export async function setDefaultPaymentMethod(
  companyId: string,
  paymentMethodId: string
): Promise<void> {
  console.log(`[Stripe Payment Methods] Setting default payment method ${paymentMethodId} for company ${companyId}`)

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId)
  })

  if (!company || !company.stripeCustomerId) {
    throw new Error(`Company ${companyId} does not have a Stripe customer`)
  }

  const stripe = await getStripeClient()

  // Update in Stripe
  await stripe.customers.update(company.stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  })

  // Update in database - unset all defaults first
  await db
    .update(paymentMethods)
    .set({
      isDefault: false,
      updatedAt: new Date(),
    })
    .where(eq(paymentMethods.companyId, companyId))

  // Set new default
  await db
    .update(paymentMethods)
    .set({
      isDefault: true,
      updatedAt: new Date(),
    })
    .where(and(
      eq(paymentMethods.stripePaymentMethodId, paymentMethodId),
      eq(paymentMethods.companyId, companyId)
    ))

  // Update company record
  await db
    .update(companies)
    .set({
      stripeDefaultPaymentMethod: paymentMethodId,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))

  console.log(`[Stripe Payment Methods] Default payment method updated successfully`)
}

/**
 * Get a specific payment method
 */
export async function getPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  const stripe = await getStripeClient()
  return stripe.paymentMethods.retrieve(paymentMethodId)
}

/**
 * Save payment method details to database.
 * Uses an atomic upsert (onConflictDoUpdate) on stripePaymentMethodId to prevent
 * duplicates even when called concurrently (e.g. webhook + manual sync).
 */
export async function savePaymentMethodToDB(
  stripePaymentMethod: Stripe.PaymentMethod,
  companyId: string,
  addedBy?: string
): Promise<typeof paymentMethods.$inferSelect> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId)
  })

  if (!company || !company.stripeCustomerId) {
    throw new Error(`Company ${companyId} does not have a Stripe customer`)
  }

  const card = stripePaymentMethod.card

  if (!card) {
    throw new Error('Payment method is not a card')
  }

  // Calculate expiration date
  const expiresAt = new Date(card.exp_year, card.exp_month - 1, 1)

  // Atomic upsert: insert or update on stripePaymentMethodId unique constraint.
  // isDefault is intentionally excluded from the conflict update — it is managed
  // separately by setDefaultPaymentMethod / syncCompanyPaymentMethods.
  const [saved] = await db
    .insert(paymentMethods)
    .values({
      companyId,
      stripePaymentMethodId: stripePaymentMethod.id,
      stripeCustomerId: company.stripeCustomerId,
      type: 'card',
      cardBrand: card.brand,
      cardLast4: card.last4,
      cardExpMonth: card.exp_month,
      cardExpYear: card.exp_year,
      cardCountry: card.country || null,
      cardFingerprint: card.fingerprint || null,
      holderName: stripePaymentMethod.billing_details?.name || null,
      billingAddress: stripePaymentMethod.billing_details?.address as any,
      metadata: stripePaymentMethod.metadata,
      isDefault: false,
      isActive: true,
      addedBy: addedBy || null,
      lastSyncedAt: new Date(),
      expiresAt,
    })
    .onConflictDoUpdate({
      target: paymentMethods.stripePaymentMethodId,
      set: {
        cardBrand: card.brand,
        cardLast4: card.last4,
        cardExpMonth: card.exp_month,
        cardExpYear: card.exp_year,
        cardCountry: card.country || null,
        cardFingerprint: card.fingerprint || null,
        holderName: stripePaymentMethod.billing_details?.name || null,
        billingAddress: stripePaymentMethod.billing_details?.address as any,
        metadata: stripePaymentMethod.metadata,
        stripeCustomerId: company.stripeCustomerId,
        isActive: true,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
        expiresAt,
      },
    })
    .returning()

  return saved
}

/**
 * Get default payment method for a company
 */
export async function getDefaultPaymentMethod(
  companyId: string
): Promise<typeof paymentMethods.$inferSelect | null> {
  const method = await db.query.paymentMethods.findFirst({
    where: and(
      eq(paymentMethods.companyId, companyId),
      eq(paymentMethods.isDefault, true),
      eq(paymentMethods.isActive, true)
    )
  })

  return method || null
}

/**
 * Check if a company has any active payment methods
 */
export async function hasActivePaymentMethods(companyId: string): Promise<boolean> {
  const methods = await db.query.paymentMethods.findMany({
    where: and(
      eq(paymentMethods.companyId, companyId),
      eq(paymentMethods.isActive, true)
    ),
    limit: 1,
  })

  return methods.length > 0
}
