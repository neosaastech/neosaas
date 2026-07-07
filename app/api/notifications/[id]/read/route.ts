import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatMessages, chatConversations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/server'

/**
 * POST /api/notifications/[id]/read
 * Mark one of the current user's own notifications as read.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const [message] = await db
      .select({ conversationId: chatMessages.conversationId })
      .from(chatMessages)
      .where(eq(chatMessages.id, id))
      .limit(1)

    if (message) {
      // Ownership check: never let one user mark another user's message as read.
      const [conversation] = await db
        .select({ userId: chatConversations.userId })
        .from(chatConversations)
        .where(eq(chatConversations.id, message.conversationId))
        .limit(1)

      if (conversation?.userId !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      await db
        .update(chatMessages)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(chatMessages.id, id))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Notifications] Failed to mark notification as read:', error)
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
  }
}
