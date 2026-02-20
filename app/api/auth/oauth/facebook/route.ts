/**
 * Facebook OAuth Initiation Route
 *
 * GET /api/auth/oauth/facebook
 *
 * Lance le flux OAuth Facebook en redirigeant vers Facebook
 */

import { NextRequest, NextResponse } from "next/server";
import { facebookOAuthProvider } from "@/lib/oauth/providers/facebook";
import { serviceApiRepository } from "@/lib/services";
import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🚀 [Facebook OAuth] Initiation du flux");
  const startTime = Date.now();

  try {
    // Récupérer la configuration depuis la BDD
    const config = await facebookOAuthProvider.getConfiguration("production", request.url);

    if (!config) {
      console.error("❌ [Facebook OAuth] Configuration non trouvée");

      return NextResponse.redirect(
        new URL("/auth/login?error=facebook_not_configured", request.url)
      );
    }

    console.log(`✅ [Facebook OAuth] Configuration trouvée`);
    console.log(`   - Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL: ${config.callbackUrl}`);

    // Générer un state token pour la protection CSRF
    const state = crypto.randomUUID();

    // Construire l'URL d'autorisation Facebook
    const authUrl = facebookOAuthProvider.getAuthorizationUrl(config, state);

    console.log(`✅ [Facebook OAuth] Redirection vers Facebook`);
    console.log(`   - URL: ${authUrl.substring(0, 80)}...`);

    // Logger l'initiation OAuth
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

    // Créer la réponse de redirection
    const response = NextResponse.redirect(authUrl);

    // Stocker le state dans un cookie pour validation ultérieure
    response.cookies.set("facebook_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("❌ [Facebook OAuth] Erreur:", error);

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
