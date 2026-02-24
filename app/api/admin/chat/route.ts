import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages, users } from '@/db/schema'
import { eq, desc, and, or, count, sql, isNull, isNotNull, inArray, ne } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth/server'

// GET /api/admin/chat - Get all conversations (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category') // 'info' | 'action' | 'urgent' | 'all'
    const includeInfo = searchParams.get('includeInfo') === 'true' // Explicitly include 'info' category
    const assignedTo = searchParams.get('assignedTo')
    const unassigned = searchParams.get('unassigned') === 'true'
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const conditions: any[] = []

    if (status) {
      conditions.push(eq(chatConversations.status, status))
    }
    if (priority) {
      conditions.push(eq(chatConversations.priority, priority))
    }

    // Category filtering logic:
    // - If category='all' or includeInfo=true: include all categories
    // - If category is specified (not 'all'): filter by that category
    // - Default (no category param): exclude 'info' notifications
    if (category) {
      if (category === 'all') {
        // Include all categories, no filter needed
      } else {
        // Support single category or comma-separated categories
        const categories = category.split(',').map(c => c.trim())
        if (categories.length === 1) {
          conditions.push(eq(chatConversations.category, categories[0] as any))
        } else {
          conditions.push(inArray(chatConversations.category, categories as any))
        }
      }
    } else if (!includeInfo) {
      // Default behavior: exclude 'info' notifications from chat list
      // Info notifications are passive and should only appear when explicitly requested
      conditions.push(ne(chatConversations.category, 'info'))
    }

    if (assignedTo) {
      conditions.push(eq(chatConversations.assignedAdminId, assignedTo))
    }
    if (unassigned) {
      conditions.push(isNull(chatConversations.assignedAdminId))
    }
    if (search) {
      conditions.push(
        or(
          sql`${chatConversations.subject} ILIKE ${`%${search}%`}`,
          sql`${chatConversations.guestEmail} ILIKE ${`%${search}%`}`,
          sql`${chatConversations.guestName} ILIKE ${`%${search}%`}`
        )
      )
    }

    const conversations = await db.query.chatConversations.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [
        desc(sql`CASE WHEN ${chatConversations.status} = 'open' THEN 0 ELSE 1 END`),
        desc(chatConversations.lastMessageAt)
      ],
      limit,
      offset,
      with: {
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
        messages: {
          orderBy: [desc(chatMessages.createdAt)],
          limit: 1,
        },
      },
    })

    // Get unread counts
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const [unreadResult] = await db
          .select({ count: count() })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.conversationId, conv.id),
              eq(chatMessages.isRead, false),
              or(
                eq(chatMessages.senderType, 'guest'),
                eq(chatMessages.senderType, 'user')
              )
            )
          )
        return {
          ...conv,
          unreadCount: unreadResult?.count || 0,
        }
      })
    )

    // Get stats
    const [openCount] = await db
      .select({ count: count() })
      .from(chatConversations)
      .where(eq(chatConversations.status, 'open'))

    const [pendingCount] = await db
      .select({ count: count() })
      .from(chatConversations)
      .where(eq(chatConversations.status, 'pending'))

    const [unassignedCount] = await db
      .select({ count: count() })
      .from(chatConversations)
      .where(
        and(
          isNull(chatConversations.assignedAdminId),
          or(
            eq(chatConversations.status, 'open'),
            eq(chatConversations.status, 'pending')
          )
        )
      )

    const [totalCount] = await db
      .select({ count: count() })
      .from(chatConversations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    // Category stats
    const [infoCount] = await db
      .select({ count: count() })
      .from(chatConversations)
      .where(eq(chatConversations.category, 'info'))

    const [actionCount] = await db
      .select({ count: count() })
      .from(chatConversations)
      .where(eq(chatConversations.category, 'action'))

    const [urgentCount] = await db
      .select({ count: count() })
      .from(chatConversations)
      .where(eq(chatConversations.category, 'urgent'))

    return NextResponse.json({
      success: true,
      data: conversationsWithUnread,
      stats: {
        open: openCount?.count || 0,
        pending: pendingCount?.count || 0,
        unassigned: unassignedCount?.count || 0,
        total: totalCount?.count || 0,
        // Category stats
        byCategory: {
          info: infoCount?.count || 0,
          action: actionCount?.count || 0,
          urgent: urgentCount?.count || 0,
        },
      },
      pagination: {
        limit,
        offset,
        total: totalCount?.count || 0,
      }
    })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to fetch admin conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
