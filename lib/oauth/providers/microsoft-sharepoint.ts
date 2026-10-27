/**
 * Microsoft SharePoint/OneDrive OAuth Provider (2026-08-30)
 *
 * Distinct from MicrosoftOAuthProvider (login): grants read-only access to a user's own
 * SharePoint/OneDrive files via Microsoft Graph. Can reuse the same Azure AD app registration
 * as the login provider (same clientId/clientSecret/tenant) -- just add the
 * Files.Read.All/Sites.Read.All/offline_access delegated permissions to it.
 */

import { BaseOAuthProvider } from "../base-provider";
import type { OAuthConfig, OAuthUserInfo, OAuthTokenResponse } from "../types";

export class MicrosoftSharepointOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super('microsoft-sharepoint');
  }

  async getConfiguration(environment: string = "production", requestUrl?: string): Promise<OAuthConfig | null> {
    return this.getConfig(environment, requestUrl);
  }

  getScopes(): string[] {
    // offline_access is required to get a refresh_token back -- Microsoft Graph tokens
    // otherwise expire in ~1h with no way to renew without a fresh interactive consent.
    return ['Files.Read.All', 'Sites.Read.All', 'offline_access'];
  }

  getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const tenant = (config as any).tenant || "organizations"; // not "common": excludes personal MSA accounts, which cannot have SharePoint via Graph anyway
    const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.callbackUrl);
    url.searchParams.set("scope", this.getScopes().join(' '));
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    return url.toString();
  }

  async exchangeCodeForToken(code: string, config: OAuthConfig): Promise<OAuthTokenResponse | null> {
    try {
      const tenant = (config as any).tenant || "organizations"; // not "common": excludes personal MSA accounts, which cannot have SharePoint via Graph anyway
      const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callbackUrl,
          grant_type: "authorization_code",
          scope: this.getScopes().join(' '),
        }).toString(),
      });
      if (!response.ok) {
        console.error(`❌ [SharePoint OAuth] Token exchange failed: ${response.status}`, await response.text());
        return null;
      }
      const data = await response.json();
      if (!data.access_token) return null;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        scope: data.scope,
      };
    } catch (error) {
      console.error("❌ [SharePoint OAuth] Error exchanging code:", error);
      return null;
    }
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo | null> {
    try {
      const res = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.id, email: data.mail || data.userPrincipalName, name: data.displayName ?? null,
        firstName: data.givenName ?? null, lastName: data.surname ?? null,
        avatar: null, provider: 'microsoft-sharepoint',
      };
    } catch {
      return null;
    }
  }
}

export const microsoftSharepointOAuthProvider = new MicrosoftSharepointOAuthProvider();
