/**
 * Microsoft OAuth Callback Route
 *
 * GET /api/auth/oauth/microsoft/callback
 *
 * Gère le callback Microsoft après l'authentification.
 */

import { NextRequest, NextResponse } from "next/server";
import { microsoftOAuthProvider } from "@/lib/oauth/providers/microsoft";
import { serviceApiRepository } from "@/lib/services";
import { OAuthUserService } from "@/lib/oauth/oauth-user-service";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🔄 [Microsoft OAuth Callback] Réception du callback");
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Gérer les erreurs de Microsoft
    if (error) {
      console.error(`❌ [Microsoft OAuth Callback] Erreur Microsoft: ${error}`);
      return NextResponse.redirect(
        new URL(`/auth/login?error=microsoft_${error}`, request.url)
      );
    }

    // Valider le code
    if (!code) {
      console.error("❌ [Microsoft OAuth Callback] Code manquant");
      return NextResponse.redirect(
        new URL("/auth/login?error=missing_code", request.url)
      );
    }

    // Vérifier le state (protection CSRF)
    const savedState = request.cookies.get("microsoft_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      console.error("❌ [Microsoft OAuth Callback] State invalide ou manquant");
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    console.log(`✅ [Microsoft OAuth Callback] Code et state validés`);

    // Récupérer la configuration
    const config = await microsoftOAuthProvider.getConfiguration("production", request.url);
    if (!config) {
      console.error("❌ [Microsoft OAuth Callback] Configuration non trouvée");
      return NextResponse.redirect(
        new URL("/auth/login?error=config_missing", request.url)
      );
    }

    // Échanger le code contre un access token
    console.log("🔄 [Microsoft OAuth Callback] Échange du code contre un access token...");
    const tokenData = await microsoftOAuthProvider.exchangeCodeForToken(code, config);

    if (!tokenData) {
      console.error(`❌ [Microsoft OAuth Callback] Échec de l'échange de token`);
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    const { accessToken } = tokenData;
    console.log("✅ [Microsoft OAuth Callback] Access token obtenu");

    // Récupérer les informations de l'utilisateur
    console.log("🔄 [Microsoft OAuth Callback] Récupération des infos utilisateur...");
    const microsoftUserInfo = await microsoftOAuthProvider.getUserInfo(accessToken);

    if (!microsoftUserInfo || !microsoftUserInfo.email) {
      console.error("❌ [Microsoft OAuth Callback] Impossible de récupérer l'email");
      return NextResponse.redirect(
        new URL("/auth/login?error=no_email", request.url)
      );
    }

    console.log(`✅ [Microsoft OAuth Callback] Utilisateur Microsoft: ${microsoftUserInfo.name}`);
    console.log(`✅ [Microsoft OAuth Callback] Email: ${microsoftUserInfo.email}`);

    // Traiter l'utilisateur via OAuthUserService (création automatique activée)
    console.log("🔄 [Microsoft OAuth Callback] Traitement via OAuthUserService...");

    try {
      const result = await OAuthUserService.processOAuthUser({
        providerId: "microsoft",
        providerUserId: microsoftUserInfo.id,
        email: microsoftUserInfo.email,
        firstName: microsoftUserInfo.firstName || "User",
        lastName: microsoftUserInfo.lastName || "",
        avatar: microsoftUserInfo.avatar,
        companyInfo: microsoftUserInfo.companyInfo, // Données entreprise de Microsoft
        accessToken,
        refreshToken: tokenData.refreshToken,
      });

      if (!result) {
        console.error("❌ [Microsoft OAuth Callback] Échec du traitement OAuth");
        return NextResponse.redirect(
          new URL("/auth/login?error=oauth_processing_failed", request.url)
        );
      }

      console.log(`✅ [Microsoft OAuth Callback] Utilisateur traité`);
      console.log(`   - User ID: ${result.userId}`);
      console.log(`   - Is New User: ${result.isNewUser}`);

      // Log successful callback
      try {
        const configRecord = await serviceApiRepository.getConfig("microsoft", "production");
        if (configRecord && (configRecord as any).id) {
          await serviceApiRepository.trackUsage({
            configId: (configRecord as any).id,
            serviceName: "microsoft",
            operation: "oauth_callback",
            status: "success",
            statusCode: "200",
            requestData: {
              microsoftUser: microsoftUserInfo.name,
              email: microsoftUserInfo.email,
            },
            responseData: {
              userId: result.userId,
              newUser: result.isNewUser,
            },
            responseTime: Date.now() - startTime,
          });
        }
      } catch (logError) {
        console.error("⚠️ [Microsoft OAuth Callback] Failed to log usage:", logError);
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

      response.cookies.delete("microsoft_oauth_state");

      return response;
    } catch (oauthError) {
      console.error("❌ [Microsoft OAuth Callback] Erreur traitement OAuth:", oauthError);

      return NextResponse.redirect(
        new URL(`/auth/login?error=oauth_processing_failed&details=${encodeURIComponent((oauthError as Error).message)}`, request.url)
      );
    }
  } catch (error: any) {
    console.error("❌ [Microsoft OAuth Callback] Erreur:", error);

    // Log error
    try {
      const configRecord = await serviceApiRepository.getConfig("microsoft", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "microsoft",
          operation: "oauth_callback",
          status: "failed",
          statusCode: "500",
          errorMessage: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Microsoft OAuth Callback] Failed to log error:", logError);
    }

    return NextResponse.redirect(
      new URL(`/auth/login?error=callback_error&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
