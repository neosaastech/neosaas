/**
 * GitHub OAuth Initiation Route
 *
 * GET /api/auth/oauth/github
 *
 * Redirects the user to GitHub for authentication.
 * Retrieves credentials from the database (no ENV variables).
 */

import { NextRequest, NextResponse } from "next/server";
import { githubOAuthProvider } from "@/lib/oauth/providers/github";
import { serviceApiRepository } from "@/lib/services";
import crypto from "crypto";

// Force this route to be dynamic (no cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🔐 [GitHub OAuth] Initiating authentication");
  const startTime = Date.now();

  try {
    // Fetch configuration from the database with automatic domain detection
    const config = await githubOAuthProvider.getConfiguration("production", request.url);

    if (!config) {
      console.error("❌ [GitHub OAuth] Configuration not found in database");
      return NextResponse.json(
        {
          error: "GitHub OAuth is not configured. Please contact the administrator.",
          details: "No GitHub OAuth configuration found in database. Configure it in /admin/api.",
        },
        { status: 503 }
      );
    }

    // Validate callback URL format
    if (!config.callbackUrl.startsWith("http://") && !config.callbackUrl.startsWith("https://")) {
      console.error("❌ [GitHub OAuth] Invalid callback URL format:", config.callbackUrl);
      return NextResponse.json(
        {
          error: "Invalid GitHub OAuth configuration",
          details: `Callback URL must be an absolute URL (starting with http:// or https://). Current value: ${config.callbackUrl}. Please update the configuration in /admin/api.`,
        },
        { status: 500 }
      );
    }

    // Generate a state token for CSRF protection
    const state = crypto.randomUUID();

    // Build the GitHub authorization URL
    const githubAuthUrl = githubOAuthProvider.getAuthorizationUrl(config, state);

    console.log(`✅ [GitHub OAuth] Redirecting to GitHub`);
    console.log(`   - Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL (redirect_uri): ${config.callbackUrl}`);
    console.log(`   - State: ${state.substring(0, 8)}...`);
    console.log(`⚠️  [GitHub OAuth] IMPORTANT: This callback URL must EXACTLY match the "Authorization callback URL" configured in your GitHub OAuth App settings at https://github.com/settings/developers`);

    // Log OAuth initiation to database
    try {
      const configRecord = await serviceApiRepository.getConfig("github", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "github",
          operation: "oauth_initiation",
          status: "success",
          statusCode: "302",
          requestData: {
            redirectUri: config.callbackUrl,
            scope: "read:user user:email",
          },
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [GitHub OAuth] Failed to log usage:", logError);
      // Don't fail the request if logging fails
    }

    // Create the response with a state cookie (CSRF protection)
    const response = NextResponse.redirect(githubAuthUrl);
    response.cookies.set("github_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("❌ [GitHub OAuth] Error during initiation:", error);

    // Log error to database
    try {
      const configRecord = await serviceApiRepository.getConfig("github", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "github",
          operation: "oauth_initiation",
          status: "failed",
          statusCode: "500",
          errorMessage: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [GitHub OAuth] Failed to log error:", logError);
    }

    return NextResponse.json(
      {
        error: "Failed to initiate GitHub OAuth",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
