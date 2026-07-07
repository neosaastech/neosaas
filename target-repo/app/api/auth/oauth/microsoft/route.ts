/**
 * Microsoft OAuth Initiation Route
 *
 * GET /api/auth/oauth/microsoft
 *
 * Lance le flux OAuth Microsoft en redirigeant vers Microsoft
 */

import { NextRequest, NextResponse } from "next/server";
import { microsoftOAuthProvider } from "@/lib/oauth/providers/microsoft";
import { serviceApiRepository } from "@/lib/services";
import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🚀 [Microsoft OAuth] Initiation du flux");
  const startTime = Date.now();

  try {
    // Récupérer la configuration depuis la BDD
    const config = await microsoftOAuthProvider.getConfiguration("production", request.url);

    if (!config) {
      console.error("❌ [Microsoft OAuth] Configuration non trouvée");

      return NextResponse.redirect(
        new URL("/auth/login?error=microsoft_not_configured", request.url)
      );
    }

    console.log(`✅ [Microsoft OAuth] Configuration trouvée`);
    console.log(`   - Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL: ${config.callbackUrl}`);

    // Générer un state token pour la protection CSRF
    const state = crypto.randomUUID();

    // Construire l'URL d'autorisation Microsoft
    const authUrl = microsoftOAuthProvider.getAuthorizationUrl(config, state);

    console.log(`✅ [Microsoft OAuth] Redirection vers Microsoft`);
    console.log(`   - URL: ${authUrl.substring(0, 80)}...`);

    // Logger l'initiation OAuth
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

    // Créer la réponse de redirection
    const response = NextResponse.redirect(authUrl);

    // Stocker le state dans un cookie pour validation ultérieure
    response.cookies.set("microsoft_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("❌ [Microsoft OAuth] Erreur:", error);

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
