import { NextRequest, NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { companies, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { ensureStripeCustomer, updateStripeCustomerMetadata } from '@/lib/stripe-customers';

/**
 * GET /api/company
 * Fetch current user's company data
 */
export async function GET() {
  try {
    validateDatabaseUrl();
    const tokenUser = await getCurrentUser();

    if (!tokenUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch fresh user data to get latest companyId
    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenUser.userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.companyId) {
      // Return null company if user is not linked to any company (e.g. super admin initially)
      return NextResponse.json({ company: null });
    }

    // Fetch company data
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, user.companyId),
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Get company error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching company data' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/company
 * Update current user's company data or create if not exists
 */
export async function PUT(request: NextRequest) {
  try {
    validateDatabaseUrl();
    const tokenUser = await getCurrentUser();

    if (!tokenUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch fresh user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenUser.userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions (simplified: allow if user exists, ideally check roles)
    // For now, we assume any authenticated user accessing this endpoint wants to manage their company

    const body = await request.json();
    const { name, email, city, address, zipCode, siret, vatNumber, phone } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another company
    const existingCompany = await db.query.companies.findFirst({
      where: eq(companies.email, email),
    });

    if (existingCompany && existingCompany.id !== user.companyId) {
      return NextResponse.json(
        { error: 'This email is already used by another company' },
        { status: 409 }
      );
    }

    let updatedCompany;

    if (!user.companyId) {
      // Create new company if user has none
      const [newCompany] = await db.insert(companies).values({
        name,
        email,
        city: city || null,
        address: address || null,
        zipCode: zipCode || null,
        siret: siret || null,
        vatNumber: vatNumber || null,
        phone: phone || null,
      }).returning();

      updatedCompany = newCompany;

      // Link user to new company
      await db.update(users)
        .set({ companyId: newCompany.id })
        .where(eq(users.id, user.id));

      // Create Stripe customer for the new company (non-blocking)
      ensureStripeCustomer(newCompany.id).catch((err) =>
        console.error('[PUT /api/company] Stripe customer creation error:', err?.message)
      );

    } else {
      // Update existing company
      const [result] = await db
        .update(companies)
        .set({
          name,
          email,
          city: city || null,
          address: address || null,
          zipCode: zipCode || null,
          siret: siret || null,
          vatNumber: vatNumber || null,
          phone: phone || null,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, user.companyId))
        .returning();

      updatedCompany = result;

      // Sync to Stripe (non-blocking).
      // Always go through ensureStripeCustomer first: it detects deleted customers,
      // searches by email, and re-creates or re-links before pushing profile data.
      // Calling updateStripeCustomerMetadata directly would fail silently if the
      // stored stripeCustomerId points to a customer that was deleted in Stripe.
      ensureStripeCustomer(user.companyId)
        .then(() => updateStripeCustomerMetadata(user.companyId, true))
        .catch((err) =>
          console.error('[PUT /api/company] Stripe sync error:', err?.message)
        );
    }

    return NextResponse.json({
      company: updatedCompany,
      message: 'Company information updated successfully',
    });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating company data' },
      { status: 500 }
    );
  }
}
