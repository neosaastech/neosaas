/**
 * GitHub OAuth Callback Route
 *
 * GET /api/auth/oauth/github/callback
 *
 * Handles the GitHub callback after authentication.
 * Exchanges the code for an access token and creates/links the user account.
 * Uses credentials from the database (no ENV variables).
 */

import { NextRequest, NextResponse } from "next/server";
import { githubOAuthProvider } from "@/lib/oauth/providers/github";
import { serviceApiRepository } from "@/lib/services";
import { OAuthUserService } from "@/lib/oauth/oauth-user-service";

// Force this route to be dynamic (no cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export async function GET(request: NextRequest) {
  console.log("🔄 [GitHub OAuth Callback] Callback received");
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle GitHub errors
    if (error) {
      console.error(`❌ [GitHub OAuth Callback] GitHub error: ${error}`);

      // Special handling for redirect_uri_mismatch error
      if (error === "redirect_uri_mismatch") {
        console.error(`❌ [GitHub OAuth Callback] REDIRECT_URI_MISMATCH ERROR`);
        console.error(`   This means the redirect_uri sent in the OAuth request does not match`);
        console.error(`   the "Authorization callback URL" configured in your GitHub OAuth App.`);
        console.error(`   `);
        console.error(`   To fix this:`);
        console.error(`   1. Go to your GitHub OAuth App settings: https://github.com/settings/developers`);
        console.error(`   2. Make sure the "Authorization callback URL" field contains EXACTLY:`);
        console.error(`      ${request.nextUrl.origin}/api/auth/oauth/github/callback`);
        console.error(`   3. Save the changes and try again`);
      }

      return NextResponse.redirect(
        new URL(`/auth/login?error=github_${error}`, request.url)
      );
    }

    // Validate the code
    if (!code) {
      console.error("❌ [GitHub OAuth Callback] Missing code");
      return NextResponse.redirect(
        new URL("/auth/login?error=missing_code", request.url)
      );
    }

    // Validate the state (CSRF protection)
    const savedState = request.cookies.get("github_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      console.error("❌ [GitHub OAuth Callback] Invalid or missing state");
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    console.log(`✅ [GitHub OAuth Callback] Code and state validated`);

    // Fetch configuration from the database with automatic domain detection
    const config = await githubOAuthProvider.getConfiguration("production", request.url);
    if (!config) {
      console.error("❌ [GitHub OAuth Callback] Configuration not found");
      console.error("   Please configure GitHub OAuth in /admin/api");
      return NextResponse.redirect(
        new URL("/auth/login?error=config_missing", request.url)
      );
    }

    // Log the configuration for debugging
    console.log(`📋 [GitHub OAuth Callback] Configuration loaded:`);
    console.log(`   - Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL: ${config.callbackUrl}`);
    console.log(`   - Expected callback: ${request.nextUrl.origin}/api/auth/oauth/github/callback`);

    // STEP 1: Exchange the code for an access token
    console.log("🔄 [GitHub OAuth Callback] Exchanging code for access token...");
    const tokenData = await githubOAuthProvider.exchangeCodeForToken(code, config);

    if (!tokenData) {
      console.error(`❌ [GitHub OAuth Callback] Token exchange failed`);
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    const { accessToken } = tokenData;
    console.log("✅ [GitHub OAuth Callback] Access token obtained");

    // STEP 2: Fetch the GitHub user information
    console.log("🔄 [GitHub OAuth Callback] Fetching user info...");
    const githubUserInfo = await githubOAuthProvider.getUserInfo(accessToken);

    if (!githubUserInfo) {
      console.error(`❌ [GitHub OAuth Callback] Failed to fetch user`);
      return NextResponse.redirect(
        new URL("/auth/login?error=user_fetch_failed", request.url)
      );
    }

    console.log(`✅ [GitHub OAuth Callback] GitHub user: ${githubUserInfo.name}`);
    console.log(`✅ [GitHub OAuth Callback] Email: ${githubUserInfo.email}`);

    const userEmail = githubUserInfo.email;

    if (!userEmail) {
      console.error("❌ [GitHub OAuth Callback] No email found");
      return NextResponse.redirect(
        new URL("/auth/login?error=no_email", request.url)
      );
    }

    // STEP 4: Use the unified service to create/update the user
    console.log("🔄 [GitHub OAuth Callback] Processing via OAuthUserService...");

    try {
      const result = await OAuthUserService.processOAuthUser({
        providerId: "github",
        providerUserId: githubUserInfo.id,
        email: userEmail,
        firstName: githubUserInfo.name.split(" ")[0] || "User",
        lastName: githubUserInfo.name.split(" ").slice(1).join(" ") || "",
        avatar: githubUserInfo.avatar,
        companyInfo: githubUserInfo.companyInfo, // Company data from GitHub
        accessToken,
        metadata: {
          login: (githubUserInfo.raw as any)?.login || githubUserInfo.name,
        },
      }); // Auto-creation enabled - account created automatically on first OAuth sign-in

      if (!result) {
        console.error("❌ [GitHub OAuth Callback] OAuth processing failed");
        return NextResponse.redirect(
          new URL("/auth/login?error=oauth_processing_failed", request.url)
        );
      }

      console.log(`✅ [GitHub OAuth Callback] User processed via OAuthUserService`);
      console.log(`   - User ID: ${result.userId}`);
      console.log(`   - Is New User: ${result.isNewUser}`);
      console.log(`   - Is New Company: ${result.isNewCompany}`);

      // Log successful OAuth callback to database
      try {
        const configRecord = await serviceApiRepository.getConfig("github", "production");
        if (configRecord && (configRecord as any).id) {
          await serviceApiRepository.trackUsage({
            configId: (configRecord as any).id,
            serviceName: "github",
            operation: "oauth_callback",
            status: "success",
            statusCode: "200",
            requestData: {
              githubUser: (githubUserInfo.raw as any)?.login || githubUserInfo.name,
              email: userEmail,
            },
            responseData: {
              userId: result.userId,
              newUser: result.isNewUser,
            },
            responseTime: Date.now() - startTime,
          });
        }
      } catch (logError) {
        console.error("⚠️ [GitHub OAuth Callback] Failed to log usage:", logError);
        // Do not block the user for a failed log
      }

      // Redirect to the dashboard with authentication cookie
      const response = NextResponse.redirect(new URL("/dashboard", request.url));

      // Set the authentication cookie
      response.cookies.set("auth-token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      // Delete the CSRF state cookie
      response.cookies.delete("github_oauth_state");

      return response;
    } catch (oauthError) {
      console.error("❌ [GitHub OAuth Callback] OAuth processing error:", oauthError);

      // Log error to database
      try {
        const configRecord = await serviceApiRepository.getConfig("github", "production");
        if (configRecord && (configRecord as any).id) {
          await serviceApiRepository.trackUsage({
            configId: (configRecord as any).id,
            serviceName: "github",
            operation: "oauth_callback",
            status: "failed",
            statusCode: "500",
            errorMessage: (oauthError as Error).message,
            responseTime: Date.now() - startTime,
          });
        }
      } catch (logError) {
        console.error("⚠️ [GitHub OAuth Callback] Failed to log error:", logError);
      }

      return NextResponse.redirect(
        new URL(`/auth/login?error=oauth_processing_failed&details=${encodeURIComponent((oauthError as Error).message)}`, request.url)
      );
    }

    // Dead code removed to fix ReferenceError
  } catch (error: any) {
    console.error("❌ [GitHub OAuth Callback] Error:", error);

    // Log error to database
    try {
      const configRecord = await serviceApiRepository.getConfig("github", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "github",
          operation: "oauth_callback",
          status: "failed",
          statusCode: "500",
          errorMessage: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [GitHub OAuth Callback] Failed to log error:", logError);
    }

    return NextResponse.redirect(
      new URL(`/auth/login?error=callback_error&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
