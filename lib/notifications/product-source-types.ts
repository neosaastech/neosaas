/**
 * Contract of a product notification source (see lib/notifications/product-sources.ts).
 * Socle file — products implement it, they do not edit it.
 */
export interface ProductNotification {
  /** Unique across sources: prefix it (e.g. "agent-op:<uuid>"). */
  id: string
  /** Display type, registered client-side with registerNotificationType(). */
  type: string
  title: string
  description?: string
  /** ISO date of the event — also decides whether the bell announces it in a toast. */
  timestamp: string
  isRead: boolean
  actionRequired: boolean
  metadata?: { viewLink?: string; [key: string]: unknown }
}

export interface NotificationUser {
  userId: string
  email?: string
}

export interface ProductNotificationSource {
  name: string
  /** The current user's own notifications, most recent first. */
  list(user: NotificationUser, options: { limit: number }): Promise<ProductNotification[]>
  /** Mark one as read. Return true when the id belongs to this source (handled), false otherwise. */
  markRead?(user: NotificationUser, id: string): Promise<boolean>
  markAllRead?(user: NotificationUser): Promise<void>
}
