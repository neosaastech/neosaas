import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { oauthConnections } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/profile/oauth
 * Returns the current user's active OAuth connections
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const connections = await db
      .select({
        id: oauthConnections.id,
        provider: oauthConnections.provider,
        email: oauthConnections.email,
        createdAt: oauthConnections.createdAt,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, currentUser.userId),
          eq(oauthConnections.isActive, true)
        )
      );

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('[Profile OAuth] Error fetching connections:', error);
    return NextResponse.json({ error: 'Failed to fetch OAuth connections' }, { status: 500 });
  }
}

/**
 * DELETE /api/profile/oauth
 * Disconnects a specific OAuth provider from the current user's account
 * Body: { provider: 'github' | 'google' | ... }
 */
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { provider } = await request.json();

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    await db
      .update(oauthConnections)
      .set({ isActive: false })
      .where(
        and(
          eq(oauthConnections.userId, currentUser.userId),
          eq(oauthConnections.provider, provider)
        )
      );

    return NextResponse.json({ success: true, message: `${provider} account disconnected` });
  } catch (error) {
    console.error('[Profile OAuth] Error disconnecting provider:', error);
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
  }
}
