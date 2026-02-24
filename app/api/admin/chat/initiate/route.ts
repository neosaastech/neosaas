import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, verifyAuth } from '@/lib/auth/server'
import { z } from 'zod'
import { determineCategory } from '@/lib/services/notification-category'

const initiateSchema = z.object({
  userId: z.string().uuid(),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
})

// POST /api/admin/chat/initiate - Admin initiates a conversation with a user
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const auth = await verifyAuth()
    const body = await request.json()
    const validated = initiateSchema.parse(body)

    // Verify the target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, validated.userId),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Determine category based on subject for proper filtering
    const category = determineCategory(validated.subject)

    // Create the conversation
    const [conversation] = await db.insert(chatConversations).values({
      userId: validated.userId,
      subject: validated.subject,
      status: 'open',
      priority: 'normal',
      category, // Set category based on subject pattern
      assignedAdminId: auth?.userId, // Auto-assign to the admin who initiated
      lastMessageAt: new Date(),
      metadata: {
        initiatedBy: 'admin',
        adminId: auth?.userId,
        adminName: `${auth?.firstName || ''} ${auth?.lastName || ''}`.trim(),
      },
    }).returning()

    // Create the initial message from admin
    const adminName = `${auth?.firstName || ''} ${auth?.lastName || ''}`.trim() || 'Admin'

    const [message] = await db.insert(chatMessages).values({
      conversationId: conversation.id,
      senderId: auth?.userId,
      senderType: 'admin',
      senderName: adminName,
      senderEmail: auth?.email || undefined,
      content: validated.message,
      messageType: 'text',
      isRead: false,
    }).returning()

    // Create a system message to indicate admin initiated
    await db.insert(chatMessages).values({
      conversationId: conversation.id,
      senderId: auth?.userId,
      senderType: 'system',
      senderName: 'System',
      content: `${adminName} started this conversation`,
      messageType: 'system',
      isRead: true,
    })

    // Fetch the complete conversation with user details
    const fullConversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, conversation.id),
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

    return NextResponse.json({
      success: true,
      data: {
        conversation: fullConversation,
        message,
      },
    })
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
    console.error('Failed to initiate conversation:', error)
    return NextResponse.json(
      { error: 'Failed to initiate conversation' },
      { status: 500 }
    )
  }
}
