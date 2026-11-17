/**
 * Server helpers the bell routes call to merge the product's notification sources
 * (lib/notifications/product-sources.ts). A failing source never breaks the bell.
 */
import { productNotificationSources } from "@/lib/notifications/product-sources"
import type { NotificationUser, ProductNotification } from "@/lib/notifications/product-source-types"

export async function listProductNotifications(user: NotificationUser, limit: number): Promise<ProductNotification[]> {
  const lists = await Promise.all(
    productNotificationSources.map((source) =>
      source.list(user, { limit }).catch((error) => {
        console.error(`[notifications] source « ${source.name} » indisponible :`, error)
        return [] as ProductNotification[]
      }),
    ),
  )
  return lists.flat()
}

/** True when a product source owned (and marked) this id. */
export async function markProductNotificationRead(user: NotificationUser, id: string): Promise<boolean> {
  for (const source of productNotificationSources) {
    if (!source.markRead) continue
    try {
      if (await source.markRead(user, id)) return true
    } catch (error) {
      console.error(`[notifications] source « ${source.name} » : lecture non enregistrée :`, error)
    }
  }
  return false
}

export async function markAllProductNotificationsRead(user: NotificationUser): Promise<void> {
  await Promise.all(
    productNotificationSources.map((source) =>
      source.markAllRead?.(user).catch((error) => {
        console.error(`[notifications] source « ${source.name} » : tout marquer lu a échoué :`, error)
      }),
    ),
  )
}
