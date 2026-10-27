/**
 * Google Drive OAuth Provider (2026-08-30)
 *
 * Distinct from GoogleOAuthProvider (lib/oauth/providers/google.ts): this one grants a user's
 * NeoSaaS account read-only access to THEIR OWN Google Drive files -- it never creates or
 * authenticates a session. Can reuse the exact same Google Cloud OAuth client as the login
 * provider (same clientId/clientSecret, service_name "google-drive" stores its own copy so the
 * two purposes stay administratively separate even when the underlying app is shared) -- just
 * needs the drive.readonly scope added to that app's consent screen.
 */

import { BaseOAuthProvider } from "../base-provider";
import type { OAuthConfig, OAuthUserInfo, OAuthTokenResponse } from "../types";

export class GoogleDriveOAuthProvider extends BaseOAuthProvider {
  constructor() {
    super('google-drive');
  }

  async getConfiguration(environment: string = "production", requestUrl?: string): Promise<OAuthConfig | null> {
    return this.getConfig(environment, requestUrl);
  }

  getScopes(): string[] {
    return ['https://www.googleapis.com/auth/drive.readonly'];
  }

  getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.callbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.getScopes().join(' '));
    url.searchParams.set("state", state);
    // access_type=offline + prompt=consent -- a refresh_token is only ever issued on the
    // FIRST consent; without prompt=consent a returning user who already granted this scope
    // gets no refresh_token on subsequent authorizations (same gotcha as the login provider).
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  }

  async exchangeCodeForToken(code: string, config: OAuthConfig): Promise<OAuthTokenResponse | null> {
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
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
        console.error(`❌ [Google Drive OAuth] Token exchange failed: ${response.status}`, await response.text());
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
      console.error("❌ [Google Drive OAuth] Error exchanging code:", error);
      return null;
    }
  }

  /** Used to show "connected as: user@gmail.com" -- not a NeoSaaS identity. */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo | null> {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.id, email: data.email, name: data.name ?? null,
        firstName: data.given_name ?? null, lastName: data.family_name ?? null,
        avatar: data.picture ?? null, provider: 'google-drive',
      };
    } catch {
      return null;
    }
  }
}

export const googleDriveOAuthProvider = new GoogleDriveOAuthProvider();
