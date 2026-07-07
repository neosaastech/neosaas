import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatMessages, chatConversations } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/server'

/**
 * POST /api/notifications/read-all
 * Mark all of the current user's own system notifications as read.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const ownConversations = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(eq(chatConversations.userId, user.userId))

    const conversationIds = ownConversations.map((c) => c.id)

    if (conversationIds.length > 0) {
      await db
        .update(chatMessages)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(chatMessages.senderType, 'system'), inArray(chatMessages.conversationId, conversationIds)))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Notifications] Failed to mark all notifications as read:', error)
    return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 })
  }
}
