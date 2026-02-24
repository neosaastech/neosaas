import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages } from '@/db/schema'
import { eq, desc, and, or, isNull, isNotNull } from 'drizzle-orm'
import { verifyAuth } from '@/lib/auth/server'
import { z } from 'zod'
import crypto from 'crypto'
import { determineCategory } from '@/lib/services/notification-category'

const createConversationSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  guestEmail: z.string().email().optional(),
  guestName: z.string().optional(),
  guestSessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// GET /api/chat/conversations - List conversations for user or guest
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth()
    const { searchParams } = new URL(request.url)
    const guestSessionId = searchParams.get('guestSessionId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    const conditions: any[] = []

    if (user) {
      // Authenticated user - get their conversations
      conditions.push(eq(chatConversations.userId, user.userId))
    } else if (guestSessionId) {
      // Guest user - get conversations by session ID
      conditions.push(eq(chatConversations.guestSessionId, guestSessionId))
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (status) {
      conditions.push(eq(chatConversations.status, status))
    }

    const conversations = await db.query.chatConversations.findMany({
      where: and(...conditions),
      orderBy: [desc(chatConversations.lastMessageAt)],
      limit,
      with: {
        messages: {
          orderBy: [desc(chatMessages.createdAt)],
          limit: 1,
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

    return NextResponse.json({ success: true, data: conversations })
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/chat/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth()
    const body = await request.json()
    const validated = createConversationSchema.parse(body)

    // Determine sender info
    const isGuest = !user
    const sessionId = isGuest ? (validated.guestSessionId || crypto.randomUUID()) : null

    // Determine category based on subject for proper filtering
    const category = determineCategory(validated.subject)

    // Create conversation
    const [conversation] = await db.insert(chatConversations).values({
      userId: user?.userId || null,
      guestEmail: isGuest ? validated.guestEmail : null,
      guestName: isGuest ? validated.guestName : null,
      guestSessionId: sessionId,
      subject: validated.subject,
      status: 'open',
      priority: 'normal',
      category, // Set category based on subject pattern
      metadata: validated.metadata || null,
      lastMessageAt: new Date(),
    }).returning()

    // Create first message
    const [message] = await db.insert(chatMessages).values({
      conversationId: conversation.id,
      senderId: user?.userId || null,
      senderType: isGuest ? 'guest' : 'user',
      senderName: isGuest ? validated.guestName : `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      senderEmail: isGuest ? validated.guestEmail : user?.email,
      content: validated.message,
      messageType: 'text',
      isRead: false,
    }).returning()

    return NextResponse.json({
      success: true,
      data: {
        conversation,
        message,
        guestSessionId: sessionId,
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Failed to create conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
