import { markProductNotificationRead } from "@/lib/notifications/product-notifications"
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatMessages, contentSyncIssues } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth/server'

/**
 * POST /api/admin/notifications/[id]/read
 * Mark a specific notification as read
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    if (await markProductNotificationRead({ userId: admin.userId, email: admin.email }, id)) {
      return NextResponse.json({ success: true })
    }

    await db
      .update(chatMessages)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(eq(chatMessages.id, id))

    // content_sync_issues has no isRead column (see route.ts) — dismissing
    // one here just means the editor acknowledged it, same as clicking
    // "read" on a chat-derived notification. It reappears on the next real
    // sync failure regardless (source/path/locale is the actual dedup key,
    // not this timestamp) — a real fix still needs a real re-sync.
    await db
      .update(contentSyncIssues)
      .set({ resolvedAt: new Date() })
      .where(eq(contentSyncIssues.id, id))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to mark notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}
