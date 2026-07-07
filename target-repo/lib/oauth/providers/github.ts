/**
 * GitHub OAuth Provider
 * 
 * Implémentation spécifique pour l'authentification GitHub OAuth
 * Hérite de BaseOAuthProvider pour la logique commune
 */

import { BaseOAuthProvider } from "../base-provider";
import type { OAuthConfig, OAuthUserInfo, OAuthTokenResponse } from "../types";

export class GitHubOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super('github');
  }

  /**
   * Récupère la configuration GitHub OAuth
   */
  async getConfiguration(environment: string = "production", requestUrl?: string): Promise<OAuthConfig | null> {
    return this.getConfig(environment, requestUrl);
  }

  /**
   * Retourne les scopes par défaut pour GitHub
   */
  getScopes(): string[] {
    return ['user:email', 'read:user'];
  }

  /**
   * Construit l'URL d'autorisation GitHub
   */
  getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
    githubAuthUrl.searchParams.set("client_id", config.clientId);
    githubAuthUrl.searchParams.set("redirect_uri", config.callbackUrl);
    githubAuthUrl.searchParams.set("scope", this.getScopes().join(' '));
    githubAuthUrl.searchParams.set("state", state);
    
    return githubAuthUrl.toString();
  }

  /**
   * Échange le code OAuth contre un access token
   */
  async exchangeCodeForToken(code: string, config: OAuthConfig): Promise<OAuthTokenResponse | null> {
    try {
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callbackUrl,
        }),
      });

      if (!response.ok) {
        console.error(`❌ [GitHub OAuth] Échec de l'échange de token: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.access_token) {
        console.error("❌ [GitHub OAuth] Access token manquant dans la réponse");
        return null;
      }

      return {
        accessToken: data.access_token,
        scope: data.scope,
        tokenType: data.token_type,
      };
    } catch (error) {
      console.error("❌ [GitHub OAuth] Erreur lors de l'échange du code:", error);
      return null;
    }
  }

  /**
   * Récupère les informations de l'utilisateur GitHub
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo | null> {
    try {
      // Récupérer les infos de base de l'utilisateur
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!userResponse.ok) {
        console.error(`❌ [GitHub OAuth] Échec récupération user: ${userResponse.status}`);
        return null;
      }

      const githubUser = await userResponse.json();

      // Récupérer l'email (peut nécessiter un appel séparé)
      let email = githubUser.email;
      
      if (!email) {
        const emailResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
          },
        });

        if (emailResponse.ok) {
          const emails = await emailResponse.json();
          const primaryEmail = emails.find((e: any) => e.primary && e.verified);
          email = primaryEmail?.email || emails[0]?.email;
        }
      }

      if (!email) {
        console.error("❌ [GitHub OAuth] Impossible de récupérer l'email de l'utilisateur");
        return null;
      }

      // Extraire les informations d'entreprise de GitHub
      const companyInfo: any = {};
      if (githubUser.company) {
        companyInfo.name = githubUser.company.replace(/^@/, ''); // Retirer le @ si présent
      }
      if (githubUser.location) {
        companyInfo.location = githubUser.location;
      }
      if (githubUser.blog) {
        companyInfo.website = githubUser.blog;
      }
      if (githubUser.bio) {
        companyInfo.description = githubUser.bio;
      }

      console.log(`✅ [GitHub OAuth] Données entreprise récupérées:`, {
        company: companyInfo.name || 'Non spécifié',
        location: companyInfo.location || 'Non spécifié',
        website: companyInfo.website || 'Non spécifié',
      });

      return {
        id: githubUser.id.toString(),
        email,
        name: githubUser.name,
        firstName: githubUser.name?.split(" ")[0] || githubUser.login,
        lastName: githubUser.name?.split(" ").slice(1).join(" ") || null,
        avatar: githubUser.avatar_url,
        provider: 'github',
        companyInfo: Object.keys(companyInfo).length > 0 ? companyInfo : undefined,
        raw: githubUser,
      };
    } catch (error) {
      console.error("❌ [GitHub OAuth] Erreur lors de la récupération des infos utilisateur:", error);
      return null;
    }
  }
}

// Export d'une instance singleton
export const githubOAuthProvider = new GitHubOAuthProvider();
