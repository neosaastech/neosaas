/**
 * Stripe Customers Management
 * Manages Stripe Customer creation and updates for companies
 * Each company gets one Stripe Customer with company data + writer users in metadata
 */

import Stripe from 'stripe'
import { db } from '@/db'
import { companies, users, userRoles, roles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getStripeCredentials } from '@/lib/stripe'

/**
 * Get or initialize Stripe client
 */
async function getStripeClient(): Promise<Stripe> {
  const credentials = await getStripeCredentials(false) // Use production by default

  if (!credentials || !credentials.secretKey) {
    throw new Error('Stripe credentials not configured. Please configure Stripe in Admin > API Management.')
  }

  return new Stripe(credentials.secretKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  })
}

/**
 * Get all writer users for a company
 * Writers are users who can manage payment methods for the company
 */
async function getCompanyWriters(companyId: string) {
  const writerRole = await db.query.roles.findFirst({
    where: and(
      eq(roles.name, 'writer'),
      eq(roles.scope, 'company')
    )
  })

  if (!writerRole) return []

  const writers = await db.query.users.findMany({
    where: eq(users.companyId, companyId),
    with: {
      userRoles: {
        where: eq(userRoles.roleId, writerRole.id)
      }
    }
  })

  return writers.filter(u => u.userRoles.length > 0)
}

/**
 * Ensure a Stripe Customer exists for a company.
 * Creates one if it doesn't exist (using company.email as the canonical reference).
 * When a customer already exists, verifies that:
 *   - it hasn't been deleted in Stripe (recreates if so)
 *   - its email matches company.email (updates if out of sync)
 */
export async function ensureStripeCustomer(companyId: string): Promise<{
  customerId: string
  created: boolean
}> {
  console.log(`[Stripe Customers] Ensuring customer for company ${companyId}`)

  // Check if company already has a Stripe customer
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId)
  })

  if (!company) {
    throw new Error(`Company ${companyId} not found`)
  }

  const stripe = await getStripeClient()

  // Verify the existing Stripe customer is still valid and email is up-to-date
  if (company.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(company.stripeCustomerId)

      if (existing.deleted) {
        // Customer was deleted in Stripe — clear local reference and recreate below
        console.log(`[Stripe Customers] Customer ${company.stripeCustomerId} deleted in Stripe — will recreate`)
        await db
          .update(companies)
          .set({ stripeCustomerId: null, updatedAt: new Date() })
          .where(eq(companies.id, companyId))
      } else {
        // Company email is the canonical reference: keep Stripe in sync
        const stripeCustomer = existing as Stripe.Customer
        if (company.email && stripeCustomer.email !== company.email) {
          await stripe.customers.update(company.stripeCustomerId, {
            email: company.email,
            name: company.name,
          })
          console.log(`[Stripe Customers] Email synced to Stripe for ${company.stripeCustomerId}: ${company.email}`)
        }
        return { customerId: company.stripeCustomerId, created: false }
      }
    } catch (err) {
      // Network error or customer not found — log and fall through to recreate
      console.error('[Stripe Customers] Could not verify Stripe customer, will recreate:', err)
      await db
        .update(companies)
        .set({ stripeCustomerId: null, updatedAt: new Date() })
        .where(eq(companies.id, companyId))
    }
  }

  // Before creating, search Stripe by email to avoid duplicate customers.
  // This handles the "customer deleted then returned" scenario: if a customer
  // with the same email already exists in Stripe, re-link it instead of creating
  // a second one.
  if (company.email) {
    try {
      const searchResult = await stripe.customers.search({
        query: `email:"${company.email}"`,
        limit: 1,
      })
      if (searchResult.data.length > 0) {
        const found = searchResult.data[0]
        console.log(`[Stripe Customers] Found existing customer ${found.id} by email — re-linking to company ${companyId}`)
        await db
          .update(companies)
          .set({ stripeCustomerId: found.id, updatedAt: new Date() })
          .where(eq(companies.id, companyId))
        // Stamp the re-linked customer with NeoSaaS identifiers so Stripe's
        // dashboard shows the correct company association.
        await stripe.customers.update(found.id, {
          name: company.name,
          metadata: { neosaas_company_id: companyId },
        })
        return { customerId: found.id, created: false }
      }
    } catch (searchErr) {
      // Non-fatal: if search fails, fall through to create a new customer
      console.warn('[Stripe Customers] Email search failed, will create new customer:', searchErr)
    }
  }

  // Create new Stripe customer (company.email is the primary identifier)
  const writers = await getCompanyWriters(companyId)

  const customerData: Stripe.CustomerCreateParams = {
    email: company.email,
    name: company.name,
    phone: company.phone || undefined,
    address: company.address ? {
      line1: company.address,
      city: company.city || undefined,
      postal_code: company.zipCode || undefined,
      country: 'FR',
    } : undefined,
    metadata: {
      neosaas_company_id: companyId,
      siret: company.siret || '',
      vat_number: company.vatNumber || '',
      writer_user_ids: writers.map(w => w.id).join(','),
      writer_user_emails: writers.map(w => w.email).join(','),
    },
    description: `NeoSaaS Company: ${company.name}`,
  }

  console.log(`[Stripe Customers] Creating new customer for ${company.name} (${company.email})`)

  const customer = await stripe.customers.create(customerData)

  console.log(`[Stripe Customers] Customer created: ${customer.id}`)

  // Persist the new Stripe customer ID
  await db
    .update(companies)
    .set({
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))

  return {
    customerId: customer.id,
    created: true
  }
}

/**
 * Update Stripe Customer metadata
 * Used when company info or writers change
 */
export async function updateStripeCustomerMetadata(
  companyId: string,
  updateCompanyInfo = true
): Promise<void> {
  console.log(`[Stripe Customers] Updating metadata for company ${companyId}`)

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId)
  })

  if (!company || !company.stripeCustomerId) {
    throw new Error(`Company ${companyId} does not have a Stripe customer`)
  }

  const stripe = await getStripeClient()
  const writers = await getCompanyWriters(companyId)

  const updateData: Stripe.CustomerUpdateParams = {
    metadata: {
      neosaas_company_id: companyId,
      siret: company.siret || '',
      vat_number: company.vatNumber || '',
      writer_user_ids: writers.map(w => w.id).join(','),
      writer_user_emails: writers.map(w => w.email).join(','),
      
    },
  }

  // Optionally update company info (name, email, address)
  if (updateCompanyInfo) {
    updateData.email = company.email
    updateData.name = company.name
    updateData.phone = company.phone || undefined
    updateData.address = company.address ? {
      line1: company.address,
      city: company.city || undefined,
      postal_code: company.zipCode || undefined,
      country: 'FR',
    } : undefined
  }

  await stripe.customers.update(company.stripeCustomerId, updateData)

  console.log(`[Stripe Customers] Customer metadata updated: ${company.stripeCustomerId}`)
}

/**
 * Get a Stripe Customer
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer> {
  const stripe = await getStripeClient()
  const customer = await stripe.customers.retrieve(customerId)

  if (customer.deleted) {
    throw new Error(`Stripe customer ${customerId} has been deleted`)
  }

  return customer as Stripe.Customer
}

/**
 * Get Stripe Customer by company ID
 */
export async function getStripeCustomerByCompanyId(companyId: string): Promise<Stripe.Customer | null> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId)
  })

  if (!company || !company.stripeCustomerId) {
    return null
  }

  return getStripeCustomer(company.stripeCustomerId)
}

/**
 * Delete Stripe Customer
 * Note: This also detaches all payment methods
 */
export async function deleteStripeCustomer(companyId: string): Promise<void> {
  console.log(`[Stripe Customers] Deleting customer for company ${companyId}`)

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId)
  })

  if (!company || !company.stripeCustomerId) {
    console.log(`[Stripe Customers] No customer to delete for company ${companyId}`)
    return
  }

  const stripe = await getStripeClient()
  await stripe.customers.del(company.stripeCustomerId)

  // Remove customer ID from company
  await db
    .update(companies)
    .set({
      stripeCustomerId: null,
      stripeDefaultPaymentMethod: null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))

  console.log(`[Stripe Customers] Customer deleted: ${company.stripeCustomerId}`)
}

/**
 * List all Stripe Customers for companies
 */
export async function listStripeCustomers(limit = 100): Promise<Stripe.Customer[]> {
  const stripe = await getStripeClient()
  const customers = await stripe.customers.list({
    limit,
    expand: ['data.subscriptions'],
  })

  return customers.data
}
