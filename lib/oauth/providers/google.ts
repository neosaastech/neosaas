/**
 * Google OAuth Provider
 * 
 * Implémentation pour l'authentification Google OAuth
 * Prêt à être utilisé une fois la configuration ajoutée en base de données
 */

import { BaseOAuthProvider } from "../base-provider";
import type { OAuthConfig, OAuthUserInfo, OAuthTokenResponse } from "../types";

export class GoogleOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super('google');
  }

  /**
   * Récupère la configuration Google OAuth
   */
  async getConfiguration(environment: string = "production", requestUrl?: string): Promise<OAuthConfig | null> {
    return this.getConfig(environment, requestUrl);
  }

  /**
   * Retourne les scopes par défaut pour Google
   */
  getScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid',
    ];
  }

  /**
   * Construit l'URL d'autorisation Google
   */
  getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", config.clientId);
    googleAuthUrl.searchParams.set("redirect_uri", config.callbackUrl);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", this.getScopes().join(' '));
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "consent");
    
    return googleAuthUrl.toString();
  }

  /**
   * Échange le code OAuth contre un access token
   */
  async exchangeCodeForToken(code: string, config: OAuthConfig): Promise<OAuthTokenResponse | null> {
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.callbackUrl,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        console.error(`❌ [Google OAuth] Échec de l'échange de token: ${response.status}`);
        const errorData = await response.text();
        console.error(`   Erreur: ${errorData}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.access_token) {
        console.error("❌ [Google OAuth] Access token manquant dans la réponse");
        return null;
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        scope: data.scope,
        tokenType: data.token_type,
      };
    } catch (error) {
      console.error("❌ [Google OAuth] Erreur lors de l'échange du code:", error);
      return null;
    }
  }

  /**
   * Récupère les informations de l'utilisateur Google
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo | null> {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error(`❌ [Google OAuth] Échec récupération user: ${response.status}`);
        return null;
      }

      const googleUser = await response.json();

      if (!googleUser.email) {
        console.error("❌ [Google OAuth] Email manquant dans la réponse");
        return null;
      }

      return {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        avatar: googleUser.picture,
        provider: 'google',
      };
    } catch (error) {
      console.error("❌ [Google OAuth] Erreur lors de la récupération des infos utilisateur:", error);
      return null;
    }
  }
}

// Export d'une instance singleton
export const googleOAuthProvider = new GoogleOAuthProvider();
