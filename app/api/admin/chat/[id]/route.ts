import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth/server'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignedAdminId: z.string().uuid().nullable().optional(),
})

// GET /api/admin/chat/[id] - Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    // Fetch conversation with relations
    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
          },
          with: {
            company: {
              columns: {
                name: true,
              },
            },
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

    // Fetch messages with sender info
    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.conversationId, id),
      orderBy: [desc(chatMessages.createdAt)],
      with: {
        sender: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    })

    // Mark messages as read for admin view
    await db.update(chatMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(chatMessages.conversationId, id))

    return NextResponse.json({
      success: true,
      data: {
        conversation,
        messages: messages.reverse(), // Return in chronological order
      }
    })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to fetch conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/chat/[id] - Update conversation status/priority
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const validated = updateSchema.parse(body)

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (validated.status !== undefined) {
      updateData.status = validated.status
    }

    if (validated.priority !== undefined) {
      updateData.priority = validated.priority
    }

    if (validated.assignedAdminId !== undefined) {
      updateData.assignedAdminId = validated.assignedAdminId
    }

    const [updated] = await db.update(chatConversations)
      .set(updateData)
      .where(eq(chatConversations.id, id))
      .returning()

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to update conversation:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/chat/[id] - Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Delete conversation (messages will cascade delete due to FK)
    await db.delete(chatConversations)
      .where(eq(chatConversations.id, id))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to delete conversation:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}
