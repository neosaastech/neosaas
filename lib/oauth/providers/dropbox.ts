/**
 * Dropbox OAuth Provider (2026-08-30)
 *
 * Grants read-only access to a user's own Dropbox files. No login purpose exists for Dropbox
 * in this boilerplate -- this is the only Dropbox OAuth client, nothing to reuse/share.
 */

import { BaseOAuthProvider } from "../base-provider";
import type { OAuthConfig, OAuthUserInfo, OAuthTokenResponse } from "../types";

export class DropboxOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super('dropbox');
  }

  async getConfiguration(environment: string = "production", requestUrl?: string): Promise<OAuthConfig | null> {
    return this.getConfig(environment, requestUrl);
  }

  getScopes(): string[] {
    return ['files.metadata.read', 'files.content.read'];
  }

  getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const url = new URL("https://www.dropbox.com/oauth2/authorize");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.callbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.getScopes().join(' '));
    url.searchParams.set("state", state);
    // token_access_type=offline -- like Google's access_type=offline, without this Dropbox
    // issues a short-lived access token only, no refresh_token.
    url.searchParams.set("token_access_type", "offline");
    return url.toString();
  }

  async exchangeCodeForToken(code: string, config: OAuthConfig): Promise<OAuthTokenResponse | null> {
    try {
      const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callbackUrl,
          grant_type: "authorization_code",
        }).toString(),
      });
      if (!response.ok) {
        console.error(`❌ [Dropbox OAuth] Token exchange failed: ${response.status}`, await response.text());
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
      console.error("❌ [Dropbox OAuth] Error exchanging code:", error);
      return null;
    }
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo | null> {
    try {
      const res = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.account_id, email: data.email, name: data.name?.display_name ?? null,
        firstName: data.name?.given_name ?? null, lastName: data.name?.surname ?? null,
        avatar: data.profile_photo_url ?? null, provider: 'dropbox',
      };
    } catch {
      return null;
    }
  }
}

export const dropboxOAuthProvider = new DropboxOAuthProvider();
