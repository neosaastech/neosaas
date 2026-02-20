'use server'

import { db } from "@/db"
import { chatConversations, chatMessages } from "@/db/schema"
import { eq } from "drizzle-orm"
import { determineCategory } from "@/lib/services/notification-category"

// =============================================================================
// HELPER FUNCTIONS - Format notifications for better readability
// =============================================================================

/**
 * Format currency amount for display
 */
function formatAmount(amountInCents: number, currency: string = 'EUR'): string {
  const amount = amountInCents / 100
  const symbol = currency === 'USD' ? '$' : '€'
  return `${symbol}${amount.toFixed(2)}`
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get product type icon and label
 */
function getProductTypeInfo(type: string): { icon: string; label: string } {
  const types: Record<string, { icon: string; label: string }> = {
    digital: { icon: '💻', label: 'Digital Product' },
    physical: { icon: '📦', label: 'Physical Product' },
    consulting: { icon: '👥', label: 'Consulting Service' },
    appointment: { icon: '📅', label: 'Appointment' },
  }
  return types[type] || { icon: '📋', label: 'Product' }
}

/**
 * Send a notification to admin via the chat system
 * Used for: new orders, new appointments, support, etc.
 *
 * @param mode - 'interactive' requires assignment, 'informative' is for tracking only
 */
export async function sendAdminNotification(params: {
  subject: string
  message: string
  type: 'order' | 'appointment' | 'support' | 'system'
  mode?: 'interactive' | 'informative'
  userId?: string
  userEmail?: string
  userName?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  metadata?: Record<string, any>
}) {
  const {
    subject,
    message,
    type,
    mode = 'interactive', // Default to interactive for backward compatibility
    userId,
    userEmail,
    userName,
    priority = 'normal',
    metadata
  } = params

  try {
    // 1. Create or retrieve a conversation for this notification type
    const conversationSubject = `[${type.toUpperCase()}] ${subject}`

    // Look for an existing open conversation for this user and type
    let conversation = await db.query.chatConversations.findFirst({
      where: (conversations, { and, or, eq }) => {
        const conditions: any[] = [
          or(
            eq(conversations.status, 'open'),
            eq(conversations.status, 'pending')
          )
        ]
        
        if (userId) {
          conditions.push(eq(conversations.userId, userId))
        } else if (userEmail) {
          conditions.push(eq(conversations.guestEmail, userEmail))
        }
        
        return and(...conditions)
      }
    })

    // If no existing conversation, create a new one
    if (!conversation) {
      // Determine category based on subject for proper filtering
      const category = determineCategory(conversationSubject)

      const [newConversation] = await db.insert(chatConversations).values({
        userId: userId || null,
        guestEmail: userEmail || null,
        guestName: userName || null,
        subject: conversationSubject,
        status: 'open',
        priority,
        category, // Set category based on subject pattern
        metadata: metadata || null, // Store metadata in conversation for InfoOverlay
        lastMessageAt: new Date()
      }).returning()

      conversation = newConversation
    } else if (metadata) {
      // Update existing conversation metadata if new metadata provided
      await db.update(chatConversations)
        .set({ metadata })
        .where(eq(chatConversations.id, conversation.id))
    }

    // 2. Add the notification message to the conversation
    await db.insert(chatMessages).values({
      conversationId: conversation.id,
      senderType: 'system',
      content: message,
      messageType: type,
      isRead: false // Admins will need to read it
    })

    // 3. Update the last activity timestamp
    await db.update(chatConversations)
      .set({
        lastMessageAt: new Date(),
        priority // Update priority if necessary
      })
      .where(eq(chatConversations.id, conversation.id))

    console.log('[AdminNotification] ✅ Notification sent', {
      conversationId: conversation.id,
      type,
      mode,
      subject
    })

    return {
      success: true,
      conversationId: conversation.id
    }
  } catch (error) {
    console.error('[AdminNotification] ❌ Failed to send notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send a new order notification to admins
 */
export async function notifyAdminNewOrder(params: {
  orderId: string
  orderNumber: string
  userId: string
  userEmail: string
  userName: string
  totalAmount: number
  currency: string
  hasAppointment: boolean
  appointmentDetails?: {
    startTime: Date
    endTime: Date
    attendeeName: string
  }
}) {
  const {
    orderId,
    orderNumber,
    userId,
    userEmail,
    userName,
    totalAmount,
    currency,
    hasAppointment,
    appointmentDetails
  } = params

  const amount = (totalAmount / 100).toFixed(2)

  let message = `📦 New order received!\n\n`
  message += `**Order:** ${orderNumber}\n`
  message += `**Customer:** ${userName} (${userEmail})\n`
  message += `**Amount:** ${amount} ${currency}\n\n`

  if (hasAppointment && appointmentDetails) {
    message += `📅 **Appointment required**\n`
    message += `• Attendee: ${appointmentDetails.attendeeName}\n`
    message += `• Start: ${appointmentDetails.startTime.toLocaleString('en-US')}\n`
    message += `• End: ${appointmentDetails.endTime.toLocaleString('en-US')}\n\n`
  }

  message += `To manage this order, go to [admin dashboard](/admin/orders/${orderId})`

  return sendAdminNotification({
    subject: `New order ${orderNumber}`,
    message,
    type: 'order',
    mode: 'interactive', // Orders require admin attention
    userId,
    userEmail,
    userName,
    priority: hasAppointment ? 'high' : 'normal',
    metadata: {
      orderId,
      orderNumber,
      totalAmount,
      currency,
      hasAppointment,
      appointmentDetails,
      notificationType: 'order_payment'
    }
  })
}

/**
 * Send a new appointment notification to admins
 */
export async function notifyAdminNewAppointment(params: {
  appointmentId: string
  userId: string
  userEmail: string
  userName: string
  productTitle: string
  startTime: Date
  endTime: Date
  attendeeName: string
  attendeeEmail: string
}) {
  const {
    appointmentId,
    userId,
    userEmail,
    userName,
    productTitle,
    startTime,
    endTime,
    attendeeName,
    attendeeEmail
  } = params

  const message = `📅 New appointment booked!\n\n` +
    `**Service:** ${productTitle}\n` +
    `**Customer:** ${userName} (${userEmail})\n` +
    `**Attendee:** ${attendeeName} (${attendeeEmail})\n` +
    `**Start:** ${startTime.toLocaleString('en-US')}\n` +
    `**End:** ${endTime.toLocaleString('en-US')}\n\n` +
    `To manage this appointment, go to [admin appointments](/admin/appointments)`

  return sendAdminNotification({
    subject: `New appointment - ${productTitle}`,
    message,
    type: 'appointment',
    mode: 'interactive', // Appointments require validation
    userId,
    userEmail,
    userName,
    priority: 'high',
    metadata: {
      appointmentId,
      productTitle,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendeeName,
      attendeeEmail,
      notificationType: 'appointment_validation'
    }
  })
}

/**
 * Send notification for orders with physical products to ship
 * Lists all physical items that need shipping
 */
export async function notifyAdminPhysicalProductsToShip(params: {
  orderId: string
  orderNumber: string
  userId: string
  userEmail: string
  userName: string
  physicalProducts: Array<{
    title: string
    quantity: number
    requiresShipping: boolean
    shippingNotes?: string
  }>
  shippingAddress?: {
    address?: string
    city?: string
    postalCode?: string
    country?: string
  }
}) {
  const {
    orderId,
    orderNumber,
    userId,
    userEmail,
    userName,
    physicalProducts,
    shippingAddress
  } = params

  let message = `📦 New order with physical products to ship!\n\n`
  message += `**Order:** ${orderNumber}\n`
  message += `**Customer:** ${userName} (${userEmail})\n\n`
  
  message += `**Products to ship:**\n`
  physicalProducts.forEach(product => {
    message += `• ${product.title} (x${product.quantity})`
    if (product.shippingNotes) {
      message += ` - ${product.shippingNotes}`
    }
    message += `\n`
  })
  message += `\n`

  if (shippingAddress) {
    message += `**Shipping Address:**\n`
    if (shippingAddress.address) message += `${shippingAddress.address}\n`
    if (shippingAddress.postalCode || shippingAddress.city) {
      message += `${shippingAddress.postalCode || ''} ${shippingAddress.city || ''}\n`
    }
    if (shippingAddress.country) message += `${shippingAddress.country}\n`
    message += `\n`
  }

  message += `**Action required:** Prepare shipment and mark as shipped once sent.\n\n`
  message += `Manage order: [admin dashboard](/admin/orders/${orderId})`

  return sendAdminNotification({
    subject: `Shipment required - Order ${orderNumber}`,
    message,
    type: 'order',
    mode: 'interactive', // Shipments require admin action
    userId,
    userEmail,
    userName,
    priority: 'high',
    metadata: {
      orderId,
      orderNumber,
      physicalProducts,
      shippingAddress,
      actionRequired: 'ship_products',
      notificationType: 'shipment_required'
    }
  })
}

/**
 * Send notification to client when physical product is shipped
 * Returns formatted message for chat
 */
export async function notifyClientProductShipped(params: {
  orderId: string
  orderNumber: string
  userId: string
  userEmail: string
  userName: string
  shippedProducts: Array<{
    title: string
    quantity: number
  }>
  trackingNumber?: string
  carrier?: string
  estimatedDelivery?: string
}) {
  const {
    orderId,
    orderNumber,
    userId,
    userEmail,
    userName,
    shippedProducts,
    trackingNumber,
    carrier,
    estimatedDelivery
  } = params

  let message = `✅ Your order has been shipped!\n\n`
  message += `**Order:** ${orderNumber}\n\n`
  
  message += `**Shipped items:**\n`
  shippedProducts.forEach(product => {
    message += `• ${product.title} (x${product.quantity})\n`
  })
  message += `\n`

  if (trackingNumber) {
    message += `**Tracking Number:** ${trackingNumber}\n`
  }
  if (carrier) {
    message += `**Carrier:** ${carrier}\n`
  }
  if (estimatedDelivery) {
    message += `**Estimated Delivery:** ${estimatedDelivery}\n`
  }
  message += `\n`
  message += `You will receive your package soon. Thank you for your order!`

  return sendAdminNotification({
    subject: `Order ${orderNumber} - Shipped`,
    message,
    type: 'system',
    mode: 'informative', // Client notification - info only
    userId,
    userEmail,
    userName,
    priority: 'normal',
    metadata: {
      orderId,
      orderNumber,
      shippedProducts,
      trackingNumber,
      carrier,
      estimatedDelivery,
      notificationType: 'shipment_confirmation'
    }
  })
}

/**
 * Send notification to client with digital product access
 * Provides download URL and license key
 */
export async function notifyClientDigitalProductAccess(params: {
  orderId: string
  orderNumber: string
  userId: string
  userEmail: string
  userName: string
  digitalProducts: Array<{
    title: string
    downloadUrl?: string | null
    licenseKey?: string | null
    licenseInstructions?: string | null
  }>
}) {
  const {
    orderId,
    orderNumber,
    userId,
    userEmail,
    userName,
    digitalProducts
  } = params

  let message = `🎉 Your digital products are ready!\n\n`
  message += `**Order:** ${orderNumber}\n\n`
  
  digitalProducts.forEach(product => {
    message += `📦 **${product.title}**\n\n`
    
    if (product.downloadUrl) {
      message += `**Download Link:** ${product.downloadUrl}\n`
    }
    
    if (product.licenseKey) {
      message += `**License Key:** \`${product.licenseKey}\`\n\n`
      
      if (product.licenseInstructions) {
        message += `**Activation Instructions:**\n${product.licenseInstructions}\n`
      }
    }
    
    message += `\n---\n\n`
  })
  
  message += `Thank you for your purchase! Your digital products are now available for instant access.\n\n`
  message += `View your order details: [dashboard](/dashboard/checkout/confirmation?orderId=${orderId})`

  return sendAdminNotification({
    subject: `Your digital products - Order ${orderNumber}`,
    message,
    type: 'system',
    mode: 'informative', // Client notification - auto-delivery
    userId,
    userEmail,
    userName,
    priority: 'normal',
    metadata: {
      orderId,
      orderNumber,
      digitalProducts: digitalProducts.map(p => ({
        title: p.title,
        hasDownloadUrl: !!p.downloadUrl,
        hasLicenseKey: !!p.licenseKey
      })),
      notificationType: 'digital_product_delivery'
    }
  })
}

/**
 * Send notification to admin about digital products order
 * Notifies admin about digital sale for tracking purposes
 */
export async function notifyAdminDigitalProductSale(params: {
  orderId: string
  orderNumber: string
  userId: string
  userEmail: string
  userName: string
  digitalProducts: Array<{
    title: string
    quantity: number
    deliveryType?: 'url' | 'license' | 'both' | string
  }>
  totalAmount: number
  currency: string
}) {
  const {
    orderId,
    orderNumber,
    userId,
    userEmail,
    userName,
    digitalProducts,
    totalAmount,
    currency
  } = params

  // Determine what was delivered
  const hasLicenseProducts = digitalProducts.some(p => p.deliveryType === 'license' || p.deliveryType === 'both' || !p.deliveryType)
  const hasUrlProducts = digitalProducts.some(p => p.deliveryType === 'url' || p.deliveryType === 'both')

  let message = `💻 New digital product sale!\n\n`
  message += `**Order:** ${orderNumber}\n`
  message += `**Customer:** ${userName} (${userEmail})\n`
  message += `**Total:** ${(totalAmount / 100).toFixed(2)} ${currency}\n\n`

  message += `**Digital products:**\n`
  digitalProducts.forEach(product => {
    const deliveryIcon = product.deliveryType === 'url' ? '🔗' :
                         product.deliveryType === 'license' ? '🔑' :
                         product.deliveryType === 'both' ? '📦' : '🔑'
    message += `• ${deliveryIcon} ${product.title} (x${product.quantity})\n`
  })
  message += `\n`

  // Update message based on what was delivered
  if (hasLicenseProducts && hasUrlProducts) {
    message += `✅ Download URLs and license keys sent to customer automatically.\n\n`
  } else if (hasLicenseProducts) {
    message += `✅ License keys generated and sent to customer automatically.\n\n`
  } else if (hasUrlProducts) {
    message += `✅ Download URLs sent to customer automatically.\n\n`
  }

  message += `Manage order: [admin dashboard](/admin/orders/${orderId})`

  return sendAdminNotification({
    subject: `Digital sale - Order ${orderNumber}`,
    message,
    type: 'order',
    mode: 'informative', // Digital sales auto-delivered - info only
    userId,
    userEmail,
    userName,
    priority: 'normal',
    metadata: {
      orderId,
      orderNumber,
      digitalProducts,
      totalAmount,
      currency,
      notificationType: 'digital_product_sale'
    }
  })
}

// =============================================================================
// NOTIFICATION MODES - Interactive vs Informative
// =============================================================================

/**
 * Notification Modes:
 *
 * INTERACTIVE MODE - Requires admin assignment and action
 * - Orders (purchases, payments)
 * - Appointment validation (physical/consulting)
 * - Shipment required
 * - Support tickets
 *
 * INFORMATIVE MODE - No assignment required, for tracking purposes
 * - Profile changes (name, email, avatar)
 * - Profile type changes
 * - Password changes
 * - Digital sales (auto-delivered)
 * - System events
 */
export type NotificationMode = 'interactive' | 'informative'

/**
 * Notification types based on product category
 * - actionRequired: true = Admin must take action (validate, ship, etc.)
 * - actionRequired: false = Info only, no intervention needed
 */
export type NotificationCategory =
  | 'appointment_validation'  // Physical/Consulting - requires RDV validation (INTERACTIVE)
  | 'shipment_required'       // Physical - needs shipping (INTERACTIVE)
  | 'order_payment'           // Purchase/payment notification (INTERACTIVE)
  | 'support_ticket'          // Support request (INTERACTIVE)
  | 'digital_info'            // Digital - info only (INFORMATIVE)
  | 'client_action'           // Client activities tracking (INFORMATIVE)
  | 'profile_change'          // Profile updates (INFORMATIVE)
  | 'system_event'            // System events (INFORMATIVE)

/**
 * Send notification for appointment that needs validation
 * For physical products or consulting services requiring a meeting
 */
export async function notifyAdminAppointmentValidation(params: {
  orderId: string
  orderNumber: string
  appointmentId: string
  userId: string
  userEmail: string
  userName: string
  productTitle: string
  productType: 'physical' | 'consulting'
  proposedDate: Date
  proposedEndDate: Date
  attendeeName: string
  attendeeEmail: string
  attendeePhone?: string
  notes?: string
}) {
  const {
    orderId,
    orderNumber,
    appointmentId,
    userId,
    userEmail,
    userName,
    productTitle,
    productType,
    proposedDate,
    proposedEndDate,
    attendeeName,
    attendeeEmail,
    attendeePhone,
    notes
  } = params

  const productIcon = productType === 'physical' ? '📦' : '👥'
  const productLabel = productType === 'physical' ? 'Physical Product' : 'Consulting Service'

  let message = `${productIcon} **Appointment Validation Required**\n\n`
  message += `**Order:** ${orderNumber}\n`
  message += `**Type:** ${productLabel}\n`
  message += `**Service:** ${productTitle}\n\n`

  message += `**📅 Proposed Appointment:**\n`
  message += `• Date: ${proposedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`
  message += `• Time: ${proposedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${proposedEndDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n\n`

  message += `**👤 Customer:**\n`
  message += `• Name: ${attendeeName}\n`
  message += `• Email: ${attendeeEmail}\n`
  if (attendeePhone) {
    message += `• Phone: ${attendeePhone}\n`
  }

  if (notes) {
    message += `\n**📝 Notes:** ${notes}\n`
  }

  message += `\n---\n`
  message += `**⚡ Actions required:**\n`
  message += `• ✅ Validate this appointment\n`
  message += `• 📅 Propose an alternative\n`
  message += `• ❌ Reject\n\n`
  message += `Manage: [admin calendar](/admin/appointments/calendar)`

  return sendAdminNotification({
    subject: `🔔 Appointment Validation - ${productTitle}`,
    message,
    type: 'appointment',
    mode: 'interactive', // Requires validation action
    userId,
    userEmail,
    userName,
    priority: 'high',
    metadata: {
      orderId,
      orderNumber,
      appointmentId,
      productTitle,
      productType,
      proposedDate: proposedDate.toISOString(),
      proposedEndDate: proposedEndDate.toISOString(),
      attendeeName,
      attendeeEmail,
      attendeePhone,
      notes,
      notificationType: 'appointment_validation',
      actionRequired: true,
      actions: ['validate', 'propose_alternative', 'reject']
    }
  })
}

/**
 * Send info-only notification for digital product sale
 * No action required from admin - just for tracking/information
 */
export async function notifyAdminDigitalSaleInfo(params: {
  orderId: string
  orderNumber: string
  userId: string
  userEmail: string
  userName: string
  products: Array<{
    title: string
    quantity: number
    price: number
  }>
  totalAmount: number
  currency: string
  deliveryStatus: 'delivered' | 'pending'
}) {
  const {
    orderId,
    orderNumber,
    userId,
    userEmail,
    userName,
    products,
    totalAmount,
    currency,
    deliveryStatus
  } = params

  const statusIcon = deliveryStatus === 'delivered' ? '✅' : '⏳'
  const statusText = deliveryStatus === 'delivered' ? 'Auto-delivered' : 'Pending'

  let message = `💻 **Digital Sale** - ${statusIcon} ${statusText}\n\n`
  message += `**Order:** ${orderNumber}\n`
  message += `**Customer:** ${userName} (${userEmail})\n`
  message += `**Amount:** ${(totalAmount / 100).toFixed(2)} ${currency}\n\n`

  message += `**Products:**\n`
  products.forEach(product => {
    message += `• ${product.title} x${product.quantity} - ${(product.price / 100).toFixed(2)} ${currency}\n`
  })

  message += `\n---\n`
  message += `ℹ️ *Info notification - no action required*\n\n`
  message += `Details: [order](/admin/orders/${orderId})`

  return sendAdminNotification({
    subject: `💻 Digital Sale - ${orderNumber}`,
    message,
    type: 'order',
    mode: 'informative', // Info only - no action required
    userId,
    userEmail,
    userName,
    priority: 'low', // Info only - low priority
    metadata: {
      orderId,
      orderNumber,
      products,
      totalAmount,
      currency,
      deliveryStatus,
      notificationType: 'digital_info',
      actionRequired: false
    }
  })
}

/**
 * Send notification for client actions - extends notifications to track client behavior
 * Useful for: payments, profile updates, subscription changes, etc.
 */
export async function notifyAdminClientAction(params: {
  userId: string
  userEmail: string
  userName: string
  actionType: 'payment' | 'profile_update' | 'subscription' | 'settings' | 'support' | 'other'
  actionTitle: string
  actionDescription: string
  metadata?: Record<string, any>
  priority?: 'low' | 'normal' | 'high'
}) {
  const {
    userId,
    userEmail,
    userName,
    actionType,
    actionTitle,
    actionDescription,
    metadata: extraMetadata,
    priority = 'low'
  } = params

  const actionIcons: Record<string, string> = {
    payment: '💳',
    profile_update: '👤',
    subscription: '📋',
    settings: '⚙️',
    support: '💬',
    other: '📌'
  }

  const icon = actionIcons[actionType] || '📌'

  let message = `${icon} **Client Action**\n\n`
  message += `**Client:** ${userName} (${userEmail})\n`
  message += `**Action:** ${actionTitle}\n\n`
  message += `${actionDescription}\n\n`
  message += `---\n`
  message += `ℹ️ *Client tracking notification*\n`
  message += `Profile: [view client](/admin/users?search=${encodeURIComponent(userEmail)})`

  return sendAdminNotification({
    subject: `${icon} ${actionTitle} - ${userName}`,
    message,
    type: 'system',
    mode: 'informative', // Client tracking - no action required
    userId,
    userEmail,
    userName,
    priority,
    metadata: {
      actionType,
      actionTitle,
      notificationType: 'client_action',
      actionRequired: false,
      ...extraMetadata
    }
  })
}

/**
 * Send notification when admin proposes alternative appointment
 * Used when original appointment cannot be validated
 */
export async function notifyClientAlternativeAppointment(params: {
  originalAppointmentId: string
  userId: string
  userEmail: string
  userName: string
  productTitle: string
  originalDate: Date
  proposedDates: Array<{
    startTime: Date
    endTime: Date
  }>
  adminName: string
  reason?: string
}) {
  const {
    originalAppointmentId,
    userId,
    userEmail,
    userName,
    productTitle,
    originalDate,
    proposedDates,
    adminName,
    reason
  } = params

  let message = `📅 **Alternative Appointment Proposal**\n\n`
  message += `Hello ${userName},\n\n`
  message += `Regarding your appointment for **${productTitle}** originally scheduled on ${originalDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}:\n\n`

  if (reason) {
    message += `**Reason:** ${reason}\n\n`
  }

  message += `**Proposed time slots:**\n`
  proposedDates.forEach((slot, index) => {
    message += `${index + 1}. ${slot.startTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })} from ${slot.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} to ${slot.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n`
  })

  message += `\nPlease confirm which time slot works best for you.\n\n`
  message += `Best regards,\n${adminName}\n\n`
  message += `Reply: [my appointments](/dashboard/appointments)`

  return sendAdminNotification({
    subject: `📅 New Time Slot Proposed - ${productTitle}`,
    message,
    type: 'appointment',
    mode: 'interactive', // Client needs to respond
    userId,
    userEmail,
    userName,
    priority: 'normal',
    metadata: {
      originalAppointmentId,
      productTitle,
      originalDate: originalDate.toISOString(),
      proposedDates: proposedDates.map(d => ({
        startTime: d.startTime.toISOString(),
        endTime: d.endTime.toISOString()
      })),
      adminName,
      reason,
      notificationType: 'alternative_appointment',
      actionRequired: true
    }
  })
}

/**
 * Send notification for profile changes - INFORMATIVE mode
 * Tracks profile updates like name change, avatar, email, profile type, etc.
 */
export async function notifyAdminProfileChange(params: {
  userId: string
  userEmail: string
  userName: string
  changeType: 'name' | 'email' | 'avatar' | 'profile_type' | 'password' | 'other'
  changeTitle: string
  changeDescription: string
  previousValue?: string
  newValue?: string
}) {
  const {
    userId,
    userEmail,
    userName,
    changeType,
    changeTitle,
    changeDescription,
    previousValue,
    newValue
  } = params

  const changeIcons: Record<string, string> = {
    name: '👤',
    email: '📧',
    avatar: '🖼️',
    profile_type: '🏷️',
    password: '🔐',
    other: '📝'
  }

  const icon = changeIcons[changeType] || '📝'

  let message = `${icon} **Profile Update**\n\n`
  message += `**User:** ${userName} (${userEmail})\n`
  message += `**Change:** ${changeTitle}\n\n`
  message += `${changeDescription}\n`

  if (previousValue && newValue) {
    message += `\n**Previous:** ${previousValue}\n`
    message += `**New:** ${newValue}\n`
  }

  message += `\n---\n`
  message += `ℹ️ *Informative notification - no action required*\n`
  message += `Profile: [view user](/admin/users?search=${encodeURIComponent(userEmail)})`

  return sendAdminNotification({
    subject: `${icon} Profile Update - ${userName}`,
    message,
    type: 'system',
    mode: 'informative', // Profile changes - no action required
    userId,
    userEmail,
    userName,
    priority: 'low',
    metadata: {
      changeType,
      changeTitle,
      previousValue,
      newValue,
      notificationType: 'profile_change',
      actionRequired: false
    }
  })
}

/**
 * Send notification for multiple profile field changes - INFORMATIVE mode
 * Use this when multiple fields are updated at once (e.g., form submission)
 */
export async function notifyAdminProfileChanges(params: {
  userId: string
  userEmail: string
  userName: string
  changes: Array<{
    field: string
    previousValue: string | null
    newValue: string | null
  }>
}) {
  const { userId, userEmail, userName, changes } = params

  if (changes.length === 0) return

  // Build detailed message with all changes
  let message = `👤 **Profile Updated**\n\n`
  message += `**User:** ${userName} (${userEmail})\n\n`
  message += `**Changes:**\n`

  const changesFormatted: Array<{ field: string, from: string, to: string }> = []

  for (const change of changes) {
    const fieldName = change.field
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim()

    const fromValue = change.previousValue || '(empty)'
    const toValue = change.newValue || '(empty)'

    message += `• **${fieldName}:** \`${fromValue}\` → \`${toValue}\`\n`

    changesFormatted.push({
      field: fieldName,
      from: fromValue,
      to: toValue
    })
  }

  message += `\n---\n`
  message += `ℹ️ *Informational notification - no action required*\n`
  message += `Profile: [view user](/admin/users?search=${encodeURIComponent(userEmail)})`

  return sendAdminNotification({
    subject: `👤 Profile Updated - ${userName}`,
    message,
    type: 'system',
    mode: 'informative',
    userId,
    userEmail,
    userName,
    priority: 'low',
    metadata: {
      notificationType: 'profile_change',
      actionRequired: false,
      changesCount: changes.length,
      changes: changesFormatted
    }
  })
}
