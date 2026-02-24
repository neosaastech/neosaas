/**
 * Microsoft OAuth Initiation Route
 *
 * GET /api/auth/oauth/microsoft
 *
 * Initiates the Microsoft OAuth flow by redirecting to Microsoft.
 */

import { NextRequest, NextResponse } from "next/server";
import { microsoftOAuthProvider } from "@/lib/oauth/providers/microsoft";
import { serviceApiRepository } from "@/lib/services";
import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🚀 [Microsoft OAuth] Initiating flow");
  const startTime = Date.now();

  try {
    // Fetch configuration from the database
    const config = await microsoftOAuthProvider.getConfiguration("production", request.url);

    if (!config) {
      console.error("❌ [Microsoft OAuth] Configuration not found");

      return NextResponse.redirect(
        new URL("/auth/login?error=microsoft_not_configured", request.url)
      );
    }

    console.log(`✅ [Microsoft OAuth] Configuration loaded`);
    console.log(`   - Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL: ${config.callbackUrl}`);

    // Generate a state token for CSRF protection
    const state = crypto.randomUUID();

    // Build the Microsoft authorization URL
    const authUrl = microsoftOAuthProvider.getAuthorizationUrl(config, state);

    console.log(`✅ [Microsoft OAuth] Redirecting to Microsoft`);
    console.log(`   - URL: ${authUrl.substring(0, 80)}...`);

    // Log OAuth initiation
    try {
      const configRecord = await serviceApiRepository.getConfig("microsoft", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "microsoft",
          operation: "oauth_initiation",
          status: "success",
          statusCode: "302",
          requestData: {
            redirectUri: config.callbackUrl,
            scope: microsoftOAuthProvider.getScopes().join(' '),
          },
          responseData: {
            redirectUrl: authUrl.substring(0, 100),
          },
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Microsoft OAuth] Failed to log usage:", logError);
    }

    // Create the redirect response
    const response = NextResponse.redirect(authUrl);

    // Store the state in a cookie for later validation
    response.cookies.set("microsoft_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("❌ [Microsoft OAuth] Error:", error);

    // Log error
    try {
      const configRecord = await serviceApiRepository.getConfig("microsoft", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "microsoft",
          operation: "oauth_initiation",
          status: "failed",
          statusCode: "500",
          errorMessage: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Microsoft OAuth] Failed to log error:", logError);
    }

    return NextResponse.redirect(
      new URL(`/auth/login?error=microsoft_init_failed&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
