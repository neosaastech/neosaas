import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { verifyAuth, isAdmin } from '@/lib/auth/server'
import { z } from 'zod'

const createMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  messageType: z.enum(['text', 'image', 'file']).default('text'),
  attachmentUrl: z.string().url().optional(),
  attachmentName: z.string().optional(),
  guestSessionId: z.string().optional(),
})

// GET /api/chat/conversations/[id]/messages - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await verifyAuth()
    const { searchParams } = new URL(request.url)
    const guestSessionId = searchParams.get('guestSessionId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
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
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/chat/conversations/[id]/messages - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await verifyAuth()
    const body = await request.json()
    const validated = createMessageSchema.parse(body)

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Check access
    const isAdminUser = user ? await isAdmin(user.userId) : false
    const isOwner = user && conversation.userId === user.userId
    const isGuestOwner = !user && conversation.guestSessionId === validated.guestSessionId

    if (!isAdminUser && !isOwner && !isGuestOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Determine sender type
    let senderType: string
    let senderName: string | null = null
    let senderEmail: string | null = null

    if (isAdminUser) {
      senderType = 'admin'
      senderName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null
      senderEmail = user?.email || null
    } else if (user) {
      senderType = 'user'
      senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
      senderEmail = user.email
    } else {
      senderType = 'guest'
      senderName = conversation.guestName
      senderEmail = conversation.guestEmail
    }

    // Create message
    const [message] = await db.insert(chatMessages).values({
      conversationId: id,
      senderId: user?.userId || null,
      senderType,
      senderName,
      senderEmail,
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

    // If admin replies, set status to pending (waiting for user response)
    if (isAdminUser && conversation.status === 'open') {
      updateData.status = 'pending'
    }
    // If user/guest replies to pending, set back to open
    if (!isAdminUser && conversation.status === 'pending') {
      updateData.status = 'open'
    }

    await db.update(chatConversations)
      .set(updateData)
      .where(eq(chatConversations.id, id))

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Failed to send message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
