/**
 * Google OAuth Initiation Route
 * 
 * GET /api/auth/oauth/google
 * 
 * Redirige l'utilisateur vers Google pour l'authentification.
 * Récupère les credentials depuis la BDD (pas d'ENV variables).
 */

import { NextRequest, NextResponse } from "next/server";
import { googleOAuthProvider } from "@/lib/oauth/providers/google";
import { serviceApiRepository } from "@/lib/services";

// Force cette route à être dynamique (pas de cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🔐 [Google OAuth] Initiation de l'authentification");
  const startTime = Date.now();

  try {
    // Récupérer la configuration depuis la BDD avec auto-détection du domaine
    const config = await googleOAuthProvider.getConfiguration("production", request.url);

    if (!config) {
      console.error("❌ [Google OAuth] Configuration non trouvée en BDD");
      return NextResponse.json(
        {
          error: "Google OAuth is not configured. Please contact the administrator.",
          details: "No Google OAuth configuration found in database. Configure it in /admin/api.",
        },
        { status: 503 }
      );
    }

    // Validate callback URL format
    if (!config.callbackUrl.startsWith("http://") && !config.callbackUrl.startsWith("https://")) {
      console.error("❌ [Google OAuth] Invalid callback URL format:", config.callbackUrl);
      return NextResponse.json(
        {
          error: "Invalid Google OAuth configuration",
          details: `Callback URL must be an absolute URL (starting with http:// or https://). Current value: ${config.callbackUrl}. Please update the configuration in /admin/api.`,
        },
        { status: 500 }
      );
    }

    // Générer un state pour la sécurité CSRF
    const state = crypto.randomUUID();

    // Construire l'URL de redirection Google
    const googleAuthUrl = googleOAuthProvider.getAuthorizationUrl(config, state);

    console.log(`✅ [Google OAuth] Redirection vers Google`);
    console.log(`   - Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL (redirect_uri): ${config.callbackUrl}`);
    console.log(`   - State: ${state.substring(0, 8)}...`);
    console.log(`⚠️  [Google OAuth] IMPORTANT: This redirect URI must EXACTLY match an "Authorized redirect URI" configured in your Google Cloud Console OAuth 2.0 Client at https://console.cloud.google.com/apis/credentials`);

    // Log OAuth initiation to database
    try {
      const configRecord = await serviceApiRepository.getConfig("google", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "google",
          operation: "oauth_initiation",
          status: "success",
          statusCode: "302",
          requestData: {
            redirectUri: config.callbackUrl,
            scope: googleOAuthProvider.getScopes().join(' '),
          },
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Google OAuth] Failed to log usage:", logError);
      // Don't fail the request if logging fails
    }

    // Créer la réponse avec cookie pour le state (sécurité CSRF)
    const response = NextResponse.redirect(googleAuthUrl);
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("❌ [Google OAuth] Erreur lors de l'initiation:", error);

    // Log error to database
    try {
      const configRecord = await serviceApiRepository.getConfig("google", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "google",
          operation: "oauth_initiation",
          status: "error",
          statusCode: "500",
          errorMessage: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Google OAuth] Failed to log error:", logError);
    }

    return NextResponse.json(
      {
        error: "Failed to initiate Google OAuth",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
