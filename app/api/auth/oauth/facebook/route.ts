/**
 * Facebook OAuth Initiation Route
 *
 * GET /api/auth/oauth/facebook
 *
 * Initiates the Facebook OAuth flow by redirecting to Facebook.
 */

import { NextRequest, NextResponse } from "next/server";
import { facebookOAuthProvider } from "@/lib/oauth/providers/facebook";
import { serviceApiRepository } from "@/lib/services";
import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🚀 [Facebook OAuth] Initiating flow");
  const startTime = Date.now();

  try {
    // Fetch configuration from the database
    const config = await facebookOAuthProvider.getConfiguration("production", request.url);

    if (!config) {
      console.error("❌ [Facebook OAuth] Configuration not found");

      return NextResponse.redirect(
        new URL("/auth/login?error=facebook_not_configured", request.url)
      );
    }

    console.log(`✅ [Facebook OAuth] Configuration loaded`);
    console.log(`   - Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL: ${config.callbackUrl}`);

    // Generate a state token for CSRF protection
    const state = crypto.randomUUID();

    // Build the Facebook authorization URL
    const authUrl = facebookOAuthProvider.getAuthorizationUrl(config, state);

    console.log(`✅ [Facebook OAuth] Redirecting to Facebook`);
    console.log(`   - URL: ${authUrl.substring(0, 80)}...`);

    // Log OAuth initiation
    try {
      const configRecord = await serviceApiRepository.getConfig("facebook", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "facebook",
          operation: "oauth_initiation",
          status: "success",
          statusCode: "302",
          requestData: {
            redirectUri: config.callbackUrl,
            scope: facebookOAuthProvider.getScopes().join(','),
          },
          responseData: {
            redirectUrl: authUrl.substring(0, 100),
          },
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Facebook OAuth] Failed to log usage:", logError);
    }

    // Create the redirect response
    const response = NextResponse.redirect(authUrl);

    // Store the state in a cookie for later validation
    response.cookies.set("facebook_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("❌ [Facebook OAuth] Error:", error);

    // Log error
    try {
      const configRecord = await serviceApiRepository.getConfig("facebook", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "facebook",
          operation: "oauth_initiation",
          status: "failed",
          statusCode: "500",
          errorMessage: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Facebook OAuth] Failed to log error:", logError);
    }

    return NextResponse.redirect(
      new URL(`/auth/login?error=facebook_init_failed&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
