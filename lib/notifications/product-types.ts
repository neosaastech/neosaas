/**
 * PRODUCT EXTENSION POINT — client-side display types of the product's notifications.
 *
 * The socle ships this function EMPTY. A product registers here the types its sources
 * (lib/notifications/product-sources.ts) return, and excludes this path from its socle update.
 * Called once by lib/notifications/notification-types.ts after the socle types — receives the
 * register function instead of importing it, so there is no runtime import cycle.
 */
import type { NotificationTypeConfig } from "@/lib/notifications/notification-types"

export function registerProductNotificationTypes(
  _register: (type: string, config: NotificationTypeConfig) => void,
): void {
  // Socle: no product types.
}
