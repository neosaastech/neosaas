import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatConversations, chatMessages, users, orders, orderItems, products } from '@/db/schema'
import { eq, desc, and, or, sql, count, ne, isNull } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth/server'

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
 * GET /api/admin/notifications
 *
 * Returns notifications grouped by event type (not by user)
 * Each notification represents an event that may require admin attention
 * Includes: open conversations, system messages, and recent orders
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'order' | 'appointment' | 'payment' | 'user' | 'support' | 'system'
    const mode = searchParams.get('mode') // 'interactive' | 'informative' | null (all)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const actionOnly = searchParams.get('actionOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const notifications: any[] = []

    // 1. Fetch recent conversations as notifications (not just open/pending)
    // Include all recent conversations to show activity
    // EXCLUDE 'info' category notifications (passive notifications for tracking only)
    let openConversations: any[] = []
    try {
      openConversations = await db
        .select({
          id: chatConversations.id,
          subject: chatConversations.subject,
          status: chatConversations.status,
          priority: chatConversations.priority,
          category: chatConversations.category,
          userId: chatConversations.userId,
          guestEmail: chatConversations.guestEmail,
          guestName: chatConversations.guestName,
          lastMessageAt: chatConversations.lastMessageAt,
          createdAt: chatConversations.createdAt,
          metadata: chatConversations.metadata,
          assignedAdminId: chatConversations.assignedAdminId,
        })
        .from(chatConversations)
        .where(
          // Exclude 'info' category - these are passive notifications (profile updates, etc.)
          // They should only appear in the admin support/tickets list, not in header notifications
          or(
            ne(chatConversations.category, 'info'),
            isNull(chatConversations.category)
          )
        )
        .orderBy(desc(chatConversations.lastMessageAt))
        .limit(Math.floor(limit / 2))

      console.log(`[Notifications] Found ${openConversations.length} conversations`)
    } catch (convError) {
      console.error('Error fetching conversations:', convError)
    }

    // Transform conversations to notifications
    for (const conv of openConversations) {
      let userName = conv.guestName
      let userEmail = conv.guestEmail
      let userImage: string | null = null

      if (conv.userId) {
        try {
          const [user] = await db
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              profileImage: users.profileImage,
            })
            .from(users)
            .where(eq(users.id, conv.userId))
            .limit(1)

          if (user) {
            userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
            userEmail = user.email || ''
            userImage = user.profileImage || null
          }
        } catch (userError) {
          console.error('Error fetching user for conversation:', userError)
        }
      }

      const metadata = conv.metadata && typeof conv.metadata === 'object'
        ? (conv.metadata as Record<string, any>)
        : {}
      const isUnassigned = !conv.assignedAdminId
      const isOpenOrPending = conv.status === 'open' || conv.status === 'pending'

      // Get the last message for preview
      let lastMessage: { content: string; senderType: string } | undefined
      try {
        const [msg] = await db
          .select({
            content: chatMessages.content,
            senderType: chatMessages.senderType,
          })
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, conv.id))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1)
        lastMessage = msg
      } catch (msgError) {
        console.error('Error fetching last message:', msgError)
      }

      // Build readable title
      const title = conv.subject || 'Support conversation'

      // Build description with context
      let description = ''
      if (isUnassigned && isOpenOrPending) {
        description = 'Unassigned • Needs attention'
      } else if (conv.priority === 'high' || conv.priority === 'urgent') {
        description = `Priority: ${conv.priority.toUpperCase()}`
      } else {
        description = `Status: ${conv.status}`
      }

      // Add last message preview if available
      if (lastMessage?.content) {
        const preview = lastMessage.content.replace(/\*\*/g, '').replace(/\n/g, ' ').trim()
        const truncated = preview.length > 50 ? preview.substring(0, 47) + '...' : preview
        description += ` • "${truncated}"`
      }

      // Determine notification mode based on conversation status
      const convMode = isOpenOrPending ? 'interactive' : 'informative'

      notifications.push({
        id: conv.id,
        type: 'support',
        mode: convMode,
        title,
        description,
        timestamp: conv.lastMessageAt || conv.createdAt,
        isRead: !isOpenOrPending, // Open/pending are considered unread
        actionRequired: isOpenOrPending && (isUnassigned || conv.priority === 'high' || conv.priority === 'urgent'),
        metadata: {
          userId: conv.userId,
          userName,
          userEmail,
          userImage,
          conversationId: conv.id,
          notificationType: 'conversation',
          isUnassigned,
          priority: conv.priority,
          status: conv.status,
        }
      })
    }

    // 2. Fetch recent orders as notifications
    let recentOrders: any[] = []
    try {
      recentOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          userId: orders.userId,
          status: orders.status,
          totalAmount: orders.totalAmount,
          currency: orders.currency,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(Math.floor(limit / 2)) // Increase limit for orders

      console.log(`[Notifications] Found ${recentOrders.length} orders`)
    } catch (ordersError) {
      console.error('Error fetching orders:', ordersError)
    }

    // Transform orders to notifications
    for (const order of recentOrders) {
      let userName = 'Customer'
      let userEmail = ''
      let userImage: string | null = null

      if (order.userId) {
        try {
          const [user] = await db
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              profileImage: users.profileImage,
            })
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1)

          if (user) {
            userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Customer'
            userEmail = user.email || ''
            userImage = user.profileImage || null
          }
        } catch (userError) {
          console.error('Error fetching user for order:', userError)
        }
      }

      // Get order items to determine product types with product details
      let items: Array<{
        itemType: string | null
        itemName: string | null
        quantity: number | null
        unitPrice: number | null
        productId: string | null
        metadata: unknown
      }> = []

      try {
        items = await db
          .select({
            itemType: orderItems.itemType,
            itemName: orderItems.itemName,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            metadata: orderItems.metadata,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id))
      } catch (itemsError) {
        console.error('Error fetching order items:', itemsError)
        // Continue with empty items array
      }

      const hasPhysical = items.some(i => i.itemType === 'physical')
      const hasDigital = items.some(i => i.itemType === 'digital')
      const hasAppointment = items.some(i => i.itemType === 'appointment' || i.itemType === 'consulting')

      const productTypes = items.map(i => i.itemType).filter((v, i, a) => a.indexOf(v) === i)

      // Format product info for display
      const formattedAmount = formatCurrency(order.totalAmount || 0, order.currency || 'EUR')

      // Get product type label
      const getProductTypeLabel = () => {
        if (hasDigital && !hasPhysical && !hasAppointment) return 'Digital'
        if (hasPhysical && !hasDigital && !hasAppointment) return 'Physical'
        if (hasAppointment && !hasDigital && !hasPhysical) return 'Appointment'
        return 'Mixed'
      }

      // Build readable title
      const productLabel = getProductTypeLabel()
      const title = `${productLabel} Order #${order.orderNumber}`

      // Build description with product names
      const productNames = items.map(i => `${i.itemName || 'Product'} (x${i.quantity || 1})`).join(', ')
      const truncatedNames = productNames.length > 60 ? productNames.substring(0, 57) + '...' : productNames

      // Build action info
      let actionInfo = ''
      if (hasDigital && !hasPhysical && !hasAppointment) {
        actionInfo = 'Auto-delivered'
      } else if (hasPhysical) {
        actionInfo = 'Needs shipping'
      } else if (hasAppointment) {
        actionInfo = 'Needs validation'
      }

      const description = `${truncatedNames} • ${formattedAmount}${actionInfo ? ` • ${actionInfo}` : ''}`

      // Determine notification mode based on product types
      // Interactive: physical products (need shipping), appointments (need validation)
      // Informative: digital products (auto-delivered)
      const orderMode = (hasPhysical || hasAppointment) ? 'interactive' : 'informative'

      notifications.push({
        id: order.id,
        type: 'order',
        mode: orderMode,
        title,
        description,
        timestamp: order.createdAt,
        isRead: order.status !== 'pending',
        actionRequired: hasPhysical || hasAppointment,
        metadata: {
          userId: order.userId,
          userName,
          userEmail,
          userImage,
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          formattedAmount,
          currency: order.currency,
          productTypes,
          productLabel,
          items: items.map(i => ({
            name: i.itemName || 'Unknown',
            type: i.itemType || 'product',
            quantity: i.quantity || 1,
            price: i.unitPrice || 0,
          })),
          hasPhysical,
          hasDigital,
          hasAppointment,
          notificationType: hasDigital && !hasPhysical && !hasAppointment ? 'digital_info' : 'order',
          // Link for digital products - link to order details or downloads
          viewLink: hasDigital ? `/dashboard/checkout/confirmation?orderId=${order.id}` : `/admin/orders/${order.id}`,
        }
      })
    }

    // 3. Fetch system messages (existing logic)
    // EXCLUDE 'info' category conversations (passive notifications for tracking only)
    let messagesQuery: any[] = []
    try {
      // Note: chatMessages table does not have a metadata column
      // Metadata is stored in chatConversations instead
      messagesQuery = await db
        .select({
          id: chatMessages.id,
          conversationId: chatMessages.conversationId,
          content: chatMessages.content,
          isRead: chatMessages.isRead,
          createdAt: chatMessages.createdAt,
          senderType: chatMessages.senderType,
          // Conversation details with metadata
          convSubject: chatConversations.subject,
          convStatus: chatConversations.status,
          convPriority: chatConversations.priority,
          convCategory: chatConversations.category,
          convUserId: chatConversations.userId,
          convGuestEmail: chatConversations.guestEmail,
          convGuestName: chatConversations.guestName,
          // Use conversation metadata instead
          convMetadata: sql<Record<string, any>>`COALESCE(${chatConversations.metadata}, '{}'::jsonb)`,
        })
        .from(chatMessages)
        .innerJoin(chatConversations, eq(chatMessages.conversationId, chatConversations.id))
        .where(
          and(
            eq(chatMessages.senderType, 'system'),
            // Exclude 'info' category - passive notifications shouldn't appear in header
            or(
              ne(chatConversations.category, 'info'),
              isNull(chatConversations.category)
            )
          )
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(Math.floor(limit / 2))

      console.log(`[Notifications] Found ${messagesQuery.length} system messages`)
    } catch (messagesError) {
      console.error('Error fetching system messages:', messagesError)
    }

    // 4. Transform system messages to notification format and add to notifications
    for (const msg of messagesQuery) {
      let userName = msg.convGuestName
      let userEmail = msg.convGuestEmail
      let userImage: string | null = null

      if (msg.convUserId) {
        try {
          const [user] = await db
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              profileImage: users.profileImage,
            })
            .from(users)
            .where(eq(users.id, msg.convUserId))
            .limit(1)

          if (user) {
            userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
            userEmail = user.email || ''
            userImage = user.profileImage || null
          }
        } catch (userError) {
          console.error('Error fetching user for message:', userError)
        }
      }

      const metadata = msg.convMetadata && typeof msg.convMetadata === 'object'
        ? (msg.convMetadata as Record<string, any>)
        : {}

      let notificationType: string = 'system'
      if (metadata.notificationType?.includes('appointment') || metadata.notificationType?.includes('validation')) {
        notificationType = 'appointment'
      } else if (metadata.notificationType?.includes('order') || metadata.notificationType?.includes('digital')) {
        notificationType = 'order'
      } else if (metadata.notificationType?.includes('payment')) {
        notificationType = 'payment'
      } else if (metadata.notificationType?.includes('client_action')) {
        notificationType = metadata.actionType || 'user'
      }

      // Get mode from metadata or infer from actionRequired
      const msgMode = metadata.notificationMode || (metadata.actionRequired ? 'interactive' : 'informative')

      notifications.push({
        id: msg.id,
        type: notificationType,
        mode: msgMode,
        title: extractTitle(msg.content, metadata),
        description: extractDescription(msg.content, metadata),
        timestamp: msg.createdAt,
        isRead: msg.isRead,
        actionRequired: metadata.actionRequired === true,
        metadata: {
          userId: msg.convUserId,
          userName,
          userEmail,
          userImage,
          orderId: metadata.orderId,
          appointmentId: metadata.appointmentId,
          conversationId: msg.conversationId,
          notificationType: metadata.notificationType,
          notificationMode: msgMode,
          actions: metadata.actions,
        }
      })
    }

    // Sort all notifications by timestamp (most recent first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply filters
    let filteredNotifications = notifications

    // Filter by type if specified
    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type)
    }

    // Filter by mode if specified (interactive vs informative)
    if (mode) {
      filteredNotifications = filteredNotifications.filter(n => n.mode === mode)
    }

    // Filter unread only
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.isRead)
    }

    // Filter action required only
    if (actionOnly) {
      filteredNotifications = filteredNotifications.filter(n => n.actionRequired)
    }

    // Limit results
    filteredNotifications = filteredNotifications.slice(0, limit)

    // Calculate stats (before filtering)
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      actionRequired: notifications.filter(n => n.actionRequired).length,
      byType: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byMode: {
        interactive: notifications.filter(n => n.mode === 'interactive').length,
        informative: notifications.filter(n => n.mode === 'informative').length,
      }
    }

    console.log(`[Notifications] Returning ${filteredNotifications.length} notifications (total: ${notifications.length}, unread: ${stats.unread}, actionRequired: ${stats.actionRequired})`)

    return NextResponse.json({
      success: true,
      notifications: filteredNotifications,
      stats
    })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * Extract a short title from notification content
 */
function extractTitle(content: string, metadata: Record<string, any>): string {
  // Use subject from metadata if available
  if (metadata.subject) {
    return metadata.subject
  }

  // Extract first line or action type
  const firstLine = content.split('\n')[0]

  // Clean up markdown
  let title = firstLine
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s*/g, '')
    .trim()

  // Truncate if too long
  if (title.length > 60) {
    title = title.substring(0, 57) + '...'
  }

  return title || 'New notification'
}

/**
 * Extract description from notification content
 */
function extractDescription(content: string, metadata: Record<string, any>): string {
  // Get lines after the first
  const lines = content.split('\n').filter(l => l.trim())

  if (lines.length <= 1) {
    return ''
  }

  // Get second and third lines
  const description = lines.slice(1, 3)
    .map(l => l.replace(/\*\*/g, '').replace(/#{1,6}\s*/g, '').trim())
    .join(' ')
    .trim()

  // Truncate if too long
  if (description.length > 100) {
    return description.substring(0, 97) + '...'
  }

  return description
}
