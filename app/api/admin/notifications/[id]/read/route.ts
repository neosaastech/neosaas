import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatMessages } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth/server'

/**
 * POST /api/admin/notifications/[id]/read
 * Mark a specific notification as read
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    await db
      .update(chatMessages)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(eq(chatMessages.id, id))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to mark notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}
