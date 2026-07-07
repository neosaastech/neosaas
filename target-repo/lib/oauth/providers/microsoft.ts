/**
 * Microsoft OAuth Provider
 *
 * Implémentation spécifique pour l'authentification Microsoft OAuth (Azure AD)
 * Hérite de BaseOAuthProvider pour la logique commune
 */

import { BaseOAuthProvider } from "../base-provider";
import type { OAuthConfig, OAuthUserInfo, OAuthTokenResponse } from "../types";

export class MicrosoftOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super('microsoft');
  }

  /**
   * Récupère la configuration Microsoft OAuth
   */
  async getConfiguration(environment: string = "production", requestUrl?: string): Promise<OAuthConfig | null> {
    return this.getConfig(environment, requestUrl);
  }

  /**
   * Retourne les scopes par défaut pour Microsoft
   */
  getScopes(): string[] {
    return [
      'openid',
      'profile',
      'email',
      'User.Read'
    ];
  }

  /**
   * Construit l'URL d'autorisation Microsoft
   */
  getAuthorizationUrl(config: OAuthConfig, state: string): string {
    // Microsoft utilise un tenant ID - par défaut "common" pour tous les comptes
    const tenant = (config as any).tenant || "common";
    const microsoftAuthUrl = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);

    microsoftAuthUrl.searchParams.set("client_id", config.clientId);
    microsoftAuthUrl.searchParams.set("redirect_uri", config.callbackUrl);
    microsoftAuthUrl.searchParams.set("scope", this.getScopes().join(' '));
    microsoftAuthUrl.searchParams.set("state", state);
    microsoftAuthUrl.searchParams.set("response_type", "code");
    microsoftAuthUrl.searchParams.set("response_mode", "query");

    return microsoftAuthUrl.toString();
  }

  /**
   * Échange le code OAuth contre un access token
   */
  async exchangeCodeForToken(code: string, config: OAuthConfig): Promise<OAuthTokenResponse | null> {
    try {
      const tenant = (config as any).tenant || "common";
      const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.callbackUrl,
        grant_type: "authorization_code",
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ [Microsoft OAuth] Échec de l'échange de token: ${response.status}`, errorData);
        return null;
      }

      const data = await response.json();

      if (!data.access_token) {
        console.error("❌ [Microsoft OAuth] Access token manquant dans la réponse");
        return null;
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        scope: data.scope,
      };
    } catch (error) {
      console.error("❌ [Microsoft OAuth] Erreur lors de l'échange du code:", error);
      return null;
    }
  }

  /**
   * Récupère les informations de l'utilisateur Microsoft
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo | null> {
    try {
      const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!userResponse.ok) {
        console.error(`❌ [Microsoft OAuth] Échec récupération user: ${userResponse.status}`);
        return null;
      }

      const microsoftUser = await userResponse.json();

      // Récupérer la photo de profil en tant que data URI base64
      let photoUrl = null;
      try {
        const photoResponse = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (photoResponse.ok) {
          const photoBlob = await photoResponse.blob();
          const arrayBuffer = await photoBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64Image = buffer.toString('base64');

          // Déterminer le type MIME (généralement JPEG pour les photos de profil Microsoft)
          const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';

          // Créer un data URI
          photoUrl = `data:${contentType};base64,${base64Image}`;

          console.log(`✅ [Microsoft OAuth] Avatar récupéré et converti en data URI`);
        }
      } catch (photoError) {
        console.warn("⚠️ [Microsoft OAuth] Impossible de récupérer la photo de profil");
      }

      if (!microsoftUser.mail && !microsoftUser.userPrincipalName) {
        console.error("❌ [Microsoft OAuth] Impossible de récupérer l'email de l'utilisateur");
        return null;
      }

      const email = microsoftUser.mail || microsoftUser.userPrincipalName;

      // Extraire les informations d'entreprise de Microsoft
      const companyInfo: any = {};
      if (microsoftUser.companyName) {
        companyInfo.name = microsoftUser.companyName;
      }
      if (microsoftUser.officeLocation) {
        companyInfo.location = microsoftUser.officeLocation;
      }
      if (microsoftUser.department) {
        companyInfo.department = microsoftUser.department;
      }
      if (microsoftUser.jobTitle) {
        companyInfo.jobTitle = microsoftUser.jobTitle;
      }

      console.log(`✅ [Microsoft OAuth] Données entreprise récupérées:`, {
        company: companyInfo.name || 'Non spécifié',
        location: companyInfo.location || 'Non spécifié',
        department: companyInfo.department || 'Non spécifié',
        jobTitle: companyInfo.jobTitle || 'Non spécifié',
      });

      return {
        id: microsoftUser.id,
        email,
        name: microsoftUser.displayName,
        firstName: microsoftUser.givenName,
        lastName: microsoftUser.surname,
        avatar: photoUrl,
        provider: 'microsoft',
        companyInfo: Object.keys(companyInfo).length > 0 ? companyInfo : undefined,
        raw: microsoftUser,
      };
    } catch (error) {
      console.error("❌ [Microsoft OAuth] Erreur lors de la récupération des infos utilisateur:", error);
      return null;
    }
  }
}

// Export d'une instance singleton
export const microsoftOAuthProvider = new MicrosoftOAuthProvider();
