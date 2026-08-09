import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatMessages, contentSyncIssues } from '@/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth/server'

/**
 * POST /api/admin/notifications/read-all
 * Mark all system notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    await db
      .update(chatMessages)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(eq(chatMessages.senderType, 'system'))

    await db
      .update(contentSyncIssues)
      .set({ resolvedAt: new Date() })
      .where(isNull(contentSyncIssues.resolvedAt))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to mark all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
}
