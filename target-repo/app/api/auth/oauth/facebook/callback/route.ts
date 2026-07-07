/**
 * Facebook OAuth Callback Route
 *
 * GET /api/auth/oauth/facebook/callback
 *
 * Gère le callback Facebook après l'authentification.
 */

import { NextRequest, NextResponse } from "next/server";
import { facebookOAuthProvider } from "@/lib/oauth/providers/facebook";
import { serviceApiRepository } from "@/lib/services";
import { OAuthUserService } from "@/lib/oauth/oauth-user-service";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🔄 [Facebook OAuth Callback] Réception du callback");
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Gérer les erreurs de Facebook
    if (error) {
      console.error(`❌ [Facebook OAuth Callback] Erreur Facebook: ${error}`);
      return NextResponse.redirect(
        new URL(`/auth/login?error=facebook_${error}`, request.url)
      );
    }

    // Valider le code
    if (!code) {
      console.error("❌ [Facebook OAuth Callback] Code manquant");
      return NextResponse.redirect(
        new URL("/auth/login?error=missing_code", request.url)
      );
    }

    // Vérifier le state (protection CSRF)
    const savedState = request.cookies.get("facebook_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      console.error("❌ [Facebook OAuth Callback] State invalide ou manquant");
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    console.log(`✅ [Facebook OAuth Callback] Code et state validés`);

    // Récupérer la configuration
    const config = await facebookOAuthProvider.getConfiguration("production", request.url);
    if (!config) {
      console.error("❌ [Facebook OAuth Callback] Configuration non trouvée");
      return NextResponse.redirect(
        new URL("/auth/login?error=config_missing", request.url)
      );
    }

    // Échanger le code contre un access token
    console.log("🔄 [Facebook OAuth Callback] Échange du code contre un access token...");
    const tokenData = await facebookOAuthProvider.exchangeCodeForToken(code, config);

    if (!tokenData) {
      console.error(`❌ [Facebook OAuth Callback] Échec de l'échange de token`);
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    const { accessToken } = tokenData;
    console.log("✅ [Facebook OAuth Callback] Access token obtenu");

    // Récupérer les informations de l'utilisateur
    console.log("🔄 [Facebook OAuth Callback] Récupération des infos utilisateur...");
    const facebookUserInfo = await facebookOAuthProvider.getUserInfo(accessToken);

    if (!facebookUserInfo || !facebookUserInfo.email) {
      console.error("❌ [Facebook OAuth Callback] Impossible de récupérer l'email");
      return NextResponse.redirect(
        new URL("/auth/login?error=no_email", request.url)
      );
    }

    console.log(`✅ [Facebook OAuth Callback] Utilisateur Facebook: ${facebookUserInfo.name}`);
    console.log(`✅ [Facebook OAuth Callback] Email: ${facebookUserInfo.email}`);

    // Traiter l'utilisateur via OAuthUserService (création automatique activée)
    console.log("🔄 [Facebook OAuth Callback] Traitement via OAuthUserService...");

    try {
      const result = await OAuthUserService.processOAuthUser({
        providerId: "facebook",
        providerUserId: facebookUserInfo.id,
        email: facebookUserInfo.email,
        firstName: facebookUserInfo.firstName || "User",
        lastName: facebookUserInfo.lastName || "",
        avatar: facebookUserInfo.avatar,
        accessToken,
      });

      if (!result) {
        console.error("❌ [Facebook OAuth Callback] Échec du traitement OAuth");
        return NextResponse.redirect(
          new URL("/auth/login?error=oauth_processing_failed", request.url)
        );
      }

      console.log(`✅ [Facebook OAuth Callback] Utilisateur traité`);
      console.log(`   - User ID: ${result.userId}`);
      console.log(`   - Is New User: ${result.isNewUser}`);

      // Log successful callback
      try {
        const configRecord = await serviceApiRepository.getConfig("facebook", "production");
        if (configRecord && (configRecord as any).id) {
          await serviceApiRepository.trackUsage({
            configId: (configRecord as any).id,
            serviceName: "facebook",
            operation: "oauth_callback",
            status: "success",
            statusCode: "200",
            requestData: {
              facebookUser: facebookUserInfo.name,
              email: facebookUserInfo.email,
            },
            responseData: {
              userId: result.userId,
              newUser: result.isNewUser,
            },
            responseTime: Date.now() - startTime,
          });
        }
      } catch (logError) {
        console.error("⚠️ [Facebook OAuth Callback] Failed to log usage:", logError);
      }

      // Redirection avec cookie d'authentification
      const response = NextResponse.redirect(new URL("/dashboard", request.url));

      response.cookies.set("auth-token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 jours
        path: "/",
      });

      response.cookies.delete("facebook_oauth_state");

      return response;
    } catch (oauthError) {
      console.error("❌ [Facebook OAuth Callback] Erreur traitement OAuth:", oauthError);

      return NextResponse.redirect(
        new URL(`/auth/login?error=oauth_processing_failed&details=${encodeURIComponent((oauthError as Error).message)}`, request.url)
      );
    }
  } catch (error: any) {
    console.error("❌ [Facebook OAuth Callback] Erreur:", error);

    // Log error
    try {
      const configRecord = await serviceApiRepository.getConfig("facebook", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "facebook",
          operation: "oauth_callback",
          status: "failed",
          statusCode: "500",
          errorMessage: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Facebook OAuth Callback] Failed to log error:", logError);
    }

    return NextResponse.redirect(
      new URL(`/auth/login?error=callback_error&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
