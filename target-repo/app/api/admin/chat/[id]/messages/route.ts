import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAdmin, verifyAuth } from '@/lib/auth/server'
import { z } from 'zod'

const createMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(5000),
  messageType: z.enum(['text', 'image', 'file']).default('text'),
  attachmentUrl: z.string().url().optional(),
  attachmentName: z.string().optional(),
})

// GET /api/admin/chat/[id]/messages - Get messages for a conversation (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.conversationId, id),
      orderBy: [desc(chatMessages.createdAt)],
      limit,
      offset,
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

    return NextResponse.json({
      success: true,
      data: messages.reverse() // Return in chronological order
    })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to fetch messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/admin/chat/[id]/messages - Send a message as admin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const auth = await verifyAuth()
    const body = await request.json()
    const validated = createMessageSchema.parse(body)

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Create message from admin
    const adminName = auth ? `${auth.firstName || ''} ${auth.lastName || ''}`.trim() : 'Admin'

    const [message] = await db.insert(chatMessages).values({
      conversationId: id,
      senderId: auth?.userId || null,
      senderType: 'admin',
      senderName: adminName || 'Admin',
      senderEmail: auth?.email || null,
      content: validated.content,
      messageType: validated.messageType,
      attachmentUrl: validated.attachmentUrl || null,
      attachmentName: validated.attachmentName || null,
      isRead: false,
    }).returning()

    // Update conversation
    const updateData: any = {
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    }

    // If admin replies and status is open, set to pending (waiting for user response)
    if (conversation.status === 'open') {
      updateData.status = 'pending'
    }

    await db.update(chatConversations)
      .set(updateData)
      .where(eq(chatConversations.id, id))

    return NextResponse.json({ success: true, data: message }, { status: 201 })
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
    console.error('Failed to send message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
