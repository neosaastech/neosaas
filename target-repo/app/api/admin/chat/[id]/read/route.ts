import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages } from '@/db/schema'
import { eq, and, or } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth/server'

// POST /api/admin/chat/[id]/read - Mark all messages as read (admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireAdmin()

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Mark all user/guest messages as read
    await db.update(chatMessages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(chatMessages.conversationId, id),
          eq(chatMessages.isRead, false),
          or(
            eq(chatMessages.senderType, 'guest'),
            eq(chatMessages.senderType, 'user')
          )
        )
      )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to mark messages as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    )
  }
}
