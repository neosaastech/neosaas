import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages, orders, orderItems } from '@/db/schema'
import { eq, desc, and, or, ne, isNull } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/server'

/**
 * Format currency amount for display
 */
function formatCurrency(amountInCents: number, currency: string = 'EUR'): string {
  const amount = amountInCents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

/**
 * GET /api/notifications
 *
 * Personal notification feed for the logged-in user — same event sources as
 * /api/admin/notifications (support conversations, orders, system messages)
 * but scoped to this user's own data only, for any authenticated user (not
 * just admins).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const actionOnly = searchParams.get('actionOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const notifications: any[] = []

    // 1. This user's own support conversations
    let ownConversations: any[] = []
    try {
      ownConversations = await db
        .select({
          id: chatConversations.id,
          subject: chatConversations.subject,
          status: chatConversations.status,
          priority: chatConversations.priority,
          category: chatConversations.category,
          lastMessageAt: chatConversations.lastMessageAt,
          createdAt: chatConversations.createdAt,
        })
        .from(chatConversations)
        .where(
          and(
            eq(chatConversations.userId, user.userId),
            or(ne(chatConversations.category, 'info'), isNull(chatConversations.category)),
          ),
        )
        .orderBy(desc(chatConversations.lastMessageAt))
        .limit(Math.floor(limit / 2))
    } catch (convError) {
      console.error('[Notifications] Error fetching own conversations:', convError)
    }

    for (const conv of ownConversations) {
      let lastMessage: { content: string } | undefined
      try {
        const [msg] = await db
          .select({ content: chatMessages.content })
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, conv.id))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1)
        lastMessage = msg
      } catch (msgError) {
        console.error('[Notifications] Error fetching last message:', msgError)
      }

      const isOpenOrPending = conv.status === 'open' || conv.status === 'pending'
      let description = `Status : ${conv.status}`
      if (lastMessage?.content) {
        const preview = lastMessage.content.replace(/\*\*/g, '').replace(/\n/g, ' ').trim()
        description += ` • "${preview.length > 50 ? preview.substring(0, 47) + '...' : preview}"`
      }

      notifications.push({
        id: conv.id,
        type: 'support',
        title: conv.subject || 'Conversation support',
        description,
        timestamp: conv.lastMessageAt || conv.createdAt,
        isRead: !isOpenOrPending,
        actionRequired: false,
        metadata: { conversationId: conv.id, status: conv.status, priority: conv.priority },
      })
    }

    // 2. This user's own orders
    let ownOrders: any[] = []
    try {
      ownOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          totalAmount: orders.totalAmount,
          currency: orders.currency,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.userId, user.userId))
        .orderBy(desc(orders.createdAt))
        .limit(Math.floor(limit / 2))
    } catch (ordersError) {
      console.error('[Notifications] Error fetching own orders:', ordersError)
    }

    for (const order of ownOrders) {
      let items: Array<{ itemType: string | null; itemName: string | null; quantity: number | null }> = []
      try {
        items = await db
          .select({
            itemType: orderItems.itemType,
            itemName: orderItems.itemName,
            quantity: orderItems.quantity,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id))
      } catch (itemsError) {
        console.error('[Notifications] Error fetching order items:', itemsError)
      }

      const hasDigital = items.some((i) => i.itemType === 'digital')
      const hasPhysical = items.some((i) => i.itemType === 'physical')
      const productNames = items.map((i) => `${i.itemName || 'Produit'} (x${i.quantity || 1})`).join(', ')
      const formattedAmount = formatCurrency(order.totalAmount || 0, order.currency || 'EUR')

      notifications.push({
        id: order.id,
        type: 'order',
        title: `Commande #${order.orderNumber}`,
        description: `${productNames.length > 60 ? productNames.substring(0, 57) + '...' : productNames} • ${formattedAmount}`,
        timestamp: order.createdAt,
        isRead: order.status !== 'pending',
        actionRequired: false,
        metadata: {
          orderId: order.id,
          formattedAmount,
          hasDigital,
          hasPhysical,
          viewLink: hasDigital ? `/dashboard/checkout/confirmation?orderId=${order.id}` : '/dashboard/payments',
        },
      })
    }

    // 3. System messages sent to this user, within their own conversations
    let ownMessages: any[] = []
    try {
      ownMessages = await db
        .select({
          id: chatMessages.id,
          conversationId: chatMessages.conversationId,
          content: chatMessages.content,
          isRead: chatMessages.isRead,
          createdAt: chatMessages.createdAt,
          convCategory: chatConversations.category,
        })
        .from(chatMessages)
        .innerJoin(chatConversations, eq(chatMessages.conversationId, chatConversations.id))
        .where(
          and(
            eq(chatMessages.senderType, 'system'),
            eq(chatConversations.userId, user.userId),
            or(ne(chatConversations.category, 'info'), isNull(chatConversations.category)),
          ),
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(Math.floor(limit / 2))
    } catch (messagesError) {
      console.error('[Notifications] Error fetching own system messages:', messagesError)
    }

    for (const msg of ownMessages) {
      const firstLine = msg.content.split('\n')[0].replace(/\*\*/g, '').replace(/#{1,6}\s*/g, '').trim()
      notifications.push({
        id: msg.id,
        type: 'system',
        title: firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine || 'Notification',
        description: '',
        timestamp: msg.createdAt,
        isRead: msg.isRead,
        actionRequired: false,
        metadata: { conversationId: msg.conversationId },
      })
    }

    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    let filteredNotifications = notifications
    if (type) {
      filteredNotifications = filteredNotifications.filter((n) => n.type === type)
    }
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter((n) => !n.isRead)
    }
    if (actionOnly) {
      filteredNotifications = filteredNotifications.filter((n) => n.actionRequired)
    }
    filteredNotifications = filteredNotifications.slice(0, limit)

    const stats = {
      total: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      actionRequired: notifications.filter((n) => n.actionRequired).length,
      byType: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }

    return NextResponse.json({ success: true, notifications: filteredNotifications, stats })
  } catch (error) {
    console.error('[Notifications] Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
