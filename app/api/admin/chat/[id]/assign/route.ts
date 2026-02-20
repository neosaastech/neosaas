import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, verifyAuth, isAdmin } from '@/lib/auth/server'
import { z } from 'zod'

const assignSchema = z.object({
  adminId: z.string().uuid().nullable(),
})

// POST /api/admin/chat/[id]/assign - Assign conversation to admin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAdmin()
    const body = await request.json()
    const validated = assignSchema.parse(body)

    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Verify the target admin exists and is an admin
    if (validated.adminId) {
      const targetAdmin = await db.query.users.findFirst({
        where: eq(users.id, validated.adminId),
      })
      if (!targetAdmin) {
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
      }
      const targetIsAdmin = await isAdmin(validated.adminId)
      if (!targetIsAdmin) {
        return NextResponse.json({ error: 'User is not an admin' }, { status: 400 })
      }
    }

    const [updated] = await db.update(chatConversations)
      .set({
        assignedAdminId: validated.adminId,
        updatedAt: new Date(),
      })
      .where(eq(chatConversations.id, id))
      .returning()

    // Add system message about assignment
    const auth = await verifyAuth()
    const assignerName = `${auth?.firstName || ''} ${auth?.lastName || ''}`.trim() || 'Admin'

    let systemMessage: string
    if (validated.adminId) {
      if (validated.adminId === auth?.userId) {
        systemMessage = `${assignerName} took charge of this conversation`
      } else {
        const assignedAdmin = await db.query.users.findFirst({
          where: eq(users.id, validated.adminId),
          columns: { firstName: true, lastName: true },
        })
        const assignedName = `${assignedAdmin?.firstName || ''} ${assignedAdmin?.lastName || ''}`.trim() || 'an administrator'
        systemMessage = `${assignerName} assigned this conversation to ${assignedName}`
      }
    } else {
      systemMessage = `${assignerName} removed the assignment from this conversation`
    }

    await db.insert(chatMessages).values({
      conversationId: id,
      senderId: auth?.userId || null,
      senderType: 'system',
      senderName: 'System',
      content: systemMessage,
      messageType: 'system',
      isRead: true,
    })

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
    console.error('Failed to assign conversation:', error)
    return NextResponse.json(
      { error: 'Failed to assign conversation' },
      { status: 500 }
    )
  }
}
