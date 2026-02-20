import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { verifyAuth, isAdmin } from '@/lib/auth/server'
import { z } from 'zod'

const updateConversationSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  subject: z.string().min(1).optional(),
})

// GET /api/chat/conversations/[id] - Get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await verifyAuth()
    const { searchParams } = new URL(request.url)
    const guestSessionId = searchParams.get('guestSessionId')

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
      with: {
        messages: {
          orderBy: [desc(chatMessages.createdAt)],
        },
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
        assignedAdmin: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check access
    const isAdminUser = user ? await isAdmin(user.userId) : false
    const isOwner = user && conversation.userId === user.userId
    const isGuestOwner = !user && conversation.guestSessionId === guestSessionId

    if (!isAdminUser && !isOwner && !isGuestOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Mark messages as read if viewing as user/guest
    if ((isOwner || isGuestOwner) && !isAdminUser) {
      await db.update(chatMessages)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(
          and(
            eq(chatMessages.conversationId, id),
            eq(chatMessages.senderType, 'admin'),
            eq(chatMessages.isRead, false)
          )
        )
    }

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    console.error('Failed to fetch conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

// PATCH /api/chat/conversations/[id] - Update conversation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    const isAdminUser = await isAdmin(user.userId)
    const isOwner = conversation.userId === user.userId

    if (!isAdminUser && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateConversationSchema.parse(body)

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (validated.status) {
      updateData.status = validated.status
      if (validated.status === 'closed') {
        updateData.closedAt = new Date()
        updateData.closedBy = user.userId
      }
    }

    if (validated.priority && isAdminUser) {
      updateData.priority = validated.priority
    }

    if (validated.subject) {
      updateData.subject = validated.subject
    }

    const [updated] = await db.update(chatConversations)
      .set(updateData)
      .where(eq(chatConversations.id, id))
      .returning()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Failed to update conversation:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

// DELETE /api/chat/conversations/[id] - Delete conversation (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdminUser = await isAdmin(user.userId)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    await db.delete(chatConversations)
      .where(eq(chatConversations.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete conversation:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}
