/**
 * Google OAuth Callback Route
 *
 * GET /api/auth/oauth/google/callback
 *
 * Handles the Google callback after authentication.
 * Exchanges the code for an access token and creates/links the user account.
 * Uses credentials from the database (no ENV variables).
 */

import { NextRequest, NextResponse } from "next/server";
import { googleOAuthProvider } from "@/lib/oauth/providers/google";
import { serviceApiRepository } from "@/lib/services";
import { db } from "@/db";
import { users, oauthConnections, userRoles, roles, companies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createToken, hashPassword } from "@/lib/auth";
import crypto from "crypto";

// Force this route to be dynamic (no cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🔄 [Google OAuth Callback] Callback received");
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle Google errors
    if (error) {
      console.error(`❌ [Google OAuth Callback] Google error: ${error}`);

      // Special handling for redirect_uri_mismatch error
      if (error === "redirect_uri_mismatch") {
        console.error(`❌ [Google OAuth Callback] REDIRECT_URI_MISMATCH ERROR`);
        console.error(`   This means the redirect_uri sent in the OAuth request does not match`);
        console.error(`   an "Authorized redirect URI" configured in your Google Cloud Console.`);
        console.error(`   `);
        console.error(`   To fix this:`);
        console.error(`   1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials`);
        console.error(`   2. Select your OAuth 2.0 Client ID`);
        console.error(`   3. Add this to "Authorized redirect URIs":`);
        console.error(`      ${request.nextUrl.origin}/api/auth/oauth/google/callback`);
        console.error(`   4. Save the changes and try again`);
      }

      return NextResponse.redirect(
        new URL(`/auth/login?error=google_${error}`, request.url)
      );
    }

    // Validate the code
    if (!code) {
      console.error("❌ [Google OAuth Callback] Missing code");
      return NextResponse.redirect(
        new URL("/auth/login?error=missing_code", request.url)
      );
    }

    // Validate the state (CSRF protection)
    const savedState = request.cookies.get("google_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      console.error("❌ [Google OAuth Callback] Invalid or missing state");
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    console.log(`✅ [Google OAuth Callback] Code and state validated`);

    // Fetch configuration from the database with automatic domain detection
    const config = await googleOAuthProvider.getConfiguration("production", request.url);
    if (!config) {
      console.error("❌ [Google OAuth Callback] Configuration not found");
      console.error("   Please configure Google OAuth in /admin/api");
      return NextResponse.redirect(
        new URL("/auth/login?error=config_missing", request.url)
      );
    }

    // Log the configuration for debugging
    console.log(`📋 [Google OAuth Callback] Configuration loaded:`);
    console.log(`   - Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL: ${config.callbackUrl}`);
    console.log(`   - Expected callback: ${request.nextUrl.origin}/api/auth/oauth/google/callback`);

    // STEP 1: Exchange the code for an access token
    console.log("🔄 [Google OAuth Callback] Exchanging code for access token...");
    const tokenData = await googleOAuthProvider.exchangeCodeForToken(code, config);

    if (!tokenData || !tokenData.accessToken) {
      console.error("❌ [Google OAuth Callback] Token exchange failed");
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    const accessToken = tokenData.accessToken;
    console.log("✅ [Google OAuth Callback] Access token obtained");

    // STEP 2: Fetch the Google user information
    console.log("🔄 [Google OAuth Callback] Fetching user info...");
    const googleUser = await googleOAuthProvider.getUserInfo(accessToken);

    if (!googleUser || !googleUser.email) {
      console.error("❌ [Google OAuth Callback] Failed to fetch user information");
      return NextResponse.redirect(
        new URL("/auth/login?error=user_fetch_failed", request.url)
      );
    }

    console.log(`✅ [Google OAuth Callback] Google user: ${googleUser.email}`);

    // STEP 3: Check if an OAuth connection already exists
    console.log("🔄 [Google OAuth Callback] Checking for existing OAuth connection...");
    const existingOAuthConnection = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.provider, "google"),
          eq(oauthConnections.providerUserId, googleUser.id)
        )
      )
      .limit(1);

    let userId: string;

    if (existingOAuthConnection.length > 0) {
      // Existing connection - Update the token
      console.log("✅ [Google OAuth Callback] Existing OAuth connection found");
      userId = existingOAuthConnection[0].userId;

      await db
        .update(oauthConnections)
        .set({
          accessToken,
          refreshToken: tokenData.refreshToken,
          metadata: {
            name: googleUser.name,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatar: googleUser.avatar,
          },
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, existingOAuthConnection[0].id));
    } else {
      // New connection - Check if user exists by email
      console.log("🔄 [Google OAuth Callback] New connection, checking user by email...");
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, googleUser.email))
        .limit(1);

      if (existingUser.length > 0) {
        // User exists - Link the Google account
        console.log("✅ [Google OAuth Callback] Existing user found, linking account");
        userId = existingUser[0].id;

        await db.insert(oauthConnections).values({
          userId,
          provider: "google",
          providerUserId: googleUser.id,
          email: googleUser.email,
          accessToken,
          refreshToken: tokenData.refreshToken,
          metadata: {
            name: googleUser.name,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatar: googleUser.avatar,
          },
          isActive: true,
        });
      } else {
        // New user - Create the account
        console.log("🆕 [Google OAuth Callback] New user, creating account...");

        // STEP A: Create the company (same as regular registration)
        const firstName = googleUser.firstName || googleUser.name?.split(" ")[0] || googleUser.email.split("@")[0];
        const lastName = googleUser.lastName || googleUser.name?.split(" ").slice(1).join(" ") || "";

        let company;
        try {
          // Check if a company with this email already exists
          const existingCompany = await db.query.companies.findFirst({
            where: eq(companies.email, googleUser.email)
          });

          if (existingCompany) {
            company = existingCompany;
            console.log(`✅ [Google OAuth Callback] Existing company found: ${company.id}`);
          } else {
            [company] = await db
              .insert(companies)
              .values({
                name: `${firstName}'s Company`,
                email: googleUser.email,
              })
              .returning();
            console.log(`✅ [Google OAuth Callback] Company created: ${company.id}`);
          }
        } catch (companyError) {
          console.error("❌ [Google OAuth Callback] Error creating company:", companyError);
          return NextResponse.redirect(
            new URL("/auth/login?error=company_creation_failed", request.url)
          );
        }

        // STEP B: Create the user with companyId
        // Generate a random password for OAuth users
        const randomPassword = crypto.randomUUID();
        const hashedPassword = await hashPassword(randomPassword);

        const [newUser] = await db
          .insert(users)
          .values({
            email: googleUser.email,
            firstName,
            lastName,
            password: hashedPassword,
            companyId: company.id,
            emailVerified: new Date(), // Email verified by Google
            isActive: true,
            profileImage: googleUser.avatar,
          })
          .returning();

        userId = newUser.id;
        console.log(`✅ [Google OAuth Callback] User created: ${userId}`);

        // STEP C: Assign the writer role (same as regular registration)
        try {
          const writerRole = await db.query.roles.findFirst({
            where: eq(roles.name, "writer"),
          });

          if (writerRole) {
            await db.insert(userRoles).values({
              userId,
              roleId: writerRole.id,
            });
            console.log(`✅ [Google OAuth Callback] Writer role assigned`);
          } else {
            console.warn("⚠️ [Google OAuth Callback] Writer role not found, account created without role");
          }
        } catch (roleError) {
          console.error("❌ [Google OAuth Callback] Error assigning role:", roleError);
          // Do not block account creation
        }

        // STEP D: Create the OAuth connection
        await db.insert(oauthConnections).values({
          userId,
          provider: "google",
          providerUserId: googleUser.id,
          email: googleUser.email,
          accessToken,
          refreshToken: tokenData.refreshToken,
          metadata: {
            name: googleUser.name,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatar: googleUser.avatar,
          },
          isActive: true,
        });

        console.log(`✅ [Google OAuth Callback] OAuth connection created for: ${userId}`);
      }
    }

    // STEP 4: Fetch the user's roles and permissions
    console.log("🔄 [Google OAuth Callback] Fetching roles and permissions...");

    const userRolesData = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const userRoleNames = userRolesData.map(r => r.roleName);

    // Fetch permissions via roles
    const userPermissionsQuery = `
      SELECT DISTINCT p.name as permission_name
      FROM user_roles ur
      INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
    `;

    const userPermissionsResult = await db.execute({
      sql: userPermissionsQuery,
      args: [userId],
    });

    const userPermissionNames = (userPermissionsResult.rows as any[]).map(row => row.permission_name);

    // Fetch full user info for the token
    const [fullUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // STEP 5: Create the JWT token using standard functions
    console.log("🔄 [Google OAuth Callback] Generating JWT...");
    const token = createToken({
      userId: fullUser.id,
      email: fullUser.email,
      companyId: fullUser.companyId || undefined,
      roles: userRoleNames,
      permissions: userPermissionNames,
    });

    console.log("✅ [Google OAuth Callback] Authentication successful");
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Email: ${fullUser.email}`);
    console.log(`   - Roles: ${userRoleNames.join(', ') || 'none'}`);
    console.log(`   - Permissions: ${userPermissionNames.length} permissions`);

    // Log successful OAuth callback to database
    try {
      const configRecord = await serviceApiRepository.getConfig("google", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "google",
          operation: "oauth_callback",
          status: "success",
          statusCode: "200",
          requestData: {
            googleEmail: googleUser.email,
          },
          responseData: {
            userId,
            newUser: existingOAuthConnection.length === 0,
          },
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Google OAuth Callback] Failed to log usage:", logError);
      // Don't fail the request if logging fails
    }

    // Redirect to the dashboard with authentication cookie
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    // Set the authentication cookie (must be on the response for redirects)
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Delete the CSRF state cookie
    response.cookies.delete("google_oauth_state");

    return response;
  } catch (error: any) {
    console.error("❌ [Google OAuth Callback] Error:", error);

    // Log error to database
    try {
      const configRecord = await serviceApiRepository.getConfig("google", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "google",
          operation: "oauth_callback",
          status: "failed",
          statusCode: "500",
          errorMessage: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Google OAuth Callback] Failed to log error:", logError);
    }

    return NextResponse.redirect(
      new URL(`/auth/login?error=callback_error&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
