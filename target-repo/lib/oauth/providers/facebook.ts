/**
 * Facebook OAuth Provider
 *
 * Implémentation spécifique pour l'authentification Facebook OAuth
 * Hérite de BaseOAuthProvider pour la logique commune
 */

import { BaseOAuthProvider } from "../base-provider";
import type { OAuthConfig, OAuthUserInfo, OAuthTokenResponse } from "../types";

export class FacebookOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super('facebook');
  }

  /**
   * Récupère la configuration Facebook OAuth
   */
  async getConfiguration(environment: string = "production", requestUrl?: string): Promise<OAuthConfig | null> {
    return this.getConfig(environment, requestUrl);
  }

  /**
   * Retourne les scopes par défaut pour Facebook
   */
  getScopes(): string[] {
    return ['email', 'public_profile'];
  }

  /**
   * Construit l'URL d'autorisation Facebook
   */
  getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const facebookAuthUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
    facebookAuthUrl.searchParams.set("client_id", config.clientId);
    facebookAuthUrl.searchParams.set("redirect_uri", config.callbackUrl);
    facebookAuthUrl.searchParams.set("scope", this.getScopes().join(','));
    facebookAuthUrl.searchParams.set("state", state);
    facebookAuthUrl.searchParams.set("response_type", "code");

    return facebookAuthUrl.toString();
  }

  /**
   * Échange le code OAuth contre un access token
   */
  async exchangeCodeForToken(code: string, config: OAuthConfig): Promise<OAuthTokenResponse | null> {
    try {
      const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
      tokenUrl.searchParams.set("client_id", config.clientId);
      tokenUrl.searchParams.set("client_secret", config.clientSecret);
      tokenUrl.searchParams.set("code", code);
      tokenUrl.searchParams.set("redirect_uri", config.callbackUrl);

      const response = await fetch(tokenUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`❌ [Facebook OAuth] Échec de l'échange de token: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (!data.access_token) {
        console.error("❌ [Facebook OAuth] Access token manquant dans la réponse");
        return null;
      }

      return {
        accessToken: data.access_token,
        tokenType: data.token_type || "bearer",
        expiresIn: data.expires_in,
      };
    } catch (error) {
      console.error("❌ [Facebook OAuth] Erreur lors de l'échange du code:", error);
      return null;
    }
  }

  /**
   * Récupère les informations de l'utilisateur Facebook
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo | null> {
    try {
      const userUrl = new URL("https://graph.facebook.com/v18.0/me");
      // Demander une image de profil en haute résolution (320x320)
      userUrl.searchParams.set("fields", "id,name,email,first_name,last_name,picture.width(320).height(320)");
      userUrl.searchParams.set("access_token", accessToken);

      const userResponse = await fetch(userUrl.toString(), {
        headers: {
          Accept: "application/json",
        },
      });

      if (!userResponse.ok) {
        console.error(`❌ [Facebook OAuth] Échec récupération user: ${userResponse.status}`);
        return null;
      }

      const facebookUser = await userResponse.json();

      if (!facebookUser.email) {
        console.error("❌ [Facebook OAuth] Impossible de récupérer l'email de l'utilisateur");
        return null;
      }

      // Extraire l'URL de l'avatar haute résolution
      const avatarUrl = facebookUser.picture?.data?.url || null;

      console.log(`✅ [Facebook OAuth] Avatar récupéré: ${avatarUrl ? 'Oui (320x320)' : 'Non'}`);

      return {
        id: facebookUser.id,
        email: facebookUser.email,
        name: facebookUser.name,
        firstName: facebookUser.first_name,
        lastName: facebookUser.last_name,
        avatar: avatarUrl,
        provider: 'facebook',
        raw: facebookUser,
      };
    } catch (error) {
      console.error("❌ [Facebook OAuth] Erreur lors de la récupération des infos utilisateur:", error);
      return null;
    }
  }
}

// Export d'une instance singleton
export const facebookOAuthProvider = new FacebookOAuthProvider();
