/**
 * GET /api/documents-storage/connect/[provider] (2026-08-30)
 *
 * Starts the OAuth flow for a document storage connector (google-drive, dropbox,
 * microsoft-sharepoint) on behalf of the CURRENTLY LOGGED IN user. Distinct from
 * the login callback routes -- this never creates a session, it links an existing
 * user to their own cloud storage. `state` carries the user id + a CSRF nonce so the callback
 * can verify both without a server-side session store for the flow itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { googleDriveOAuthProvider } from "@/lib/oauth/providers/google-drive";
import { dropboxOAuthProvider } from "@/lib/oauth/providers/dropbox";
import { microsoftSharepointOAuthProvider } from "@/lib/oauth/providers/microsoft-sharepoint";

const PROVIDERS = {
  "google-drive": googleDriveOAuthProvider,
  "dropbox": dropboxOAuthProvider,
  "microsoft-sharepoint": microsoftSharepointOAuthProvider,
} as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const impl = PROVIDERS[provider as keyof typeof PROVIDERS];
  if (!impl) {
    return NextResponse.json({ error: `Unknown storage provider: ${provider}` }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await impl.getConfiguration("production", request.url);
  if (!config) {
    return NextResponse.json({ error: `${provider} is not configured (admin/api)` }, { status: 503 });
  }

  // state = userId.nonce -- the callback checks the nonce against a short-lived cookie (below)
  // and trusts userId only after that check passes, never from the state alone.
  const nonce = crypto.randomUUID();
  const state = `${user.userId}.${nonce}`;
  const authUrl = impl.getAuthorizationUrl(config, state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`storage_connect_nonce_${provider}`, nonce, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  return response;
}
