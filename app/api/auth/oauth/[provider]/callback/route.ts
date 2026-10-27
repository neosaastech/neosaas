/**
 * GET /api/auth/oauth/[provider]/callback (2026-08-30)
 *
 * Callback for the 3 document storage connectors (google-drive, dropbox,
 * microsoft-sharepoint) -- NOT the login providers, which each keep their own static route
 * (app/api/auth/oauth/google/callback, etc.) and their own session-creating logic. This route
 * only ever links an ALREADY authenticated user to their cloud storage; it never creates a
 * session or an account. Coexists with the static login folders -- Next.js matches the static
 * segment first, this dynamic one only ever sees the 3 storage provider values.
 *
 * Tokens are stored in `oauth_connections` (existing table, already shaped for
 * provider/providerUserId/accessToken/refreshToken/scope/metadata) -- reused as-is rather than
 * adding a new table, `provider` already being a plain text column with no enum constraint.
 * NOT encrypted at rest today (same as how this table already stored login tokens before this
 * change) -- flagged as a follow-up, not solved in this pass.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/db";
import { oauthConnections } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { googleDriveOAuthProvider } from "@/lib/oauth/providers/google-drive";
import { dropboxOAuthProvider } from "@/lib/oauth/providers/dropbox";
import { microsoftSharepointOAuthProvider } from "@/lib/oauth/providers/microsoft-sharepoint";

const PROVIDERS = {
  "google-drive": googleDriveOAuthProvider,
  "dropbox": dropboxOAuthProvider,
  "microsoft-sharepoint": microsoftSharepointOAuthProvider,
} as const;

const REDIRECT_AFTER = "/dashboard/documents/connections";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const impl = PROVIDERS[provider as keyof typeof PROVIDERS];
  if (!impl) {
    return NextResponse.json({ error: `Unknown storage provider: ${provider}` }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const providerError = searchParams.get("error");
  const base = new URL(REDIRECT_AFTER, request.url);

  if (providerError || !code || !state) {
    base.searchParams.set("error", providerError || "missing_code_or_state");
    return NextResponse.redirect(base);
  }

  const [userId, nonce] = state.split(".");
  const cookieNonce = request.cookies.get(`storage_connect_nonce_${provider}`)?.value;
  if (!userId || !nonce || nonce !== cookieNonce) {
    base.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(base);
  }

  const user = await getCurrentUser();
  if (!user || user.userId !== userId) {
    // The nonce matched but the logged-in user differs from who started the flow (session
    // changed mid-flow, or a stale cookie replayed) -- refuse rather than link to the wrong
    // account.
    base.searchParams.set("error", "session_mismatch");
    return NextResponse.redirect(base);
  }

  const config = await impl.getConfiguration("production", request.url);
  if (!config) {
    base.searchParams.set("error", "not_configured");
    return NextResponse.redirect(base);
  }

  const tokens = await impl.exchangeCodeForToken(code, config);
  if (!tokens) {
    base.searchParams.set("error", "token_exchange_failed");
    return NextResponse.redirect(base);
  }

  const info = await impl.getUserInfo(tokens.accessToken);

  const existing = await db.query.oauthConnections.findFirst({
    where: and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, provider)),
  });

  const expiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null;
  const values = {
    userId,
    provider,
    providerUserId: info?.id ?? "unknown",
    email: info?.email ?? "unknown",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? existing?.refreshToken ?? null, // some providers only send it on first consent
    expiresAt,
    scope: tokens.scope ?? impl.getScopes().join(' '),
    metadata: info ? { name: info.name, avatar: info.avatar } : null,
    isActive: true,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(oauthConnections).set(values).where(eq(oauthConnections.id, existing.id));
  } else {
    await db.insert(oauthConnections).values(values);
  }

  const response = NextResponse.redirect(base);
  response.cookies.delete(`storage_connect_nonce_${provider}`);
  return response;
}
