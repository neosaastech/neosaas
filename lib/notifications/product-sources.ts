/**
 * PRODUCT EXTENSION POINT — notification sources added by a product built on the socle.
 *
 * The socle ships this file EMPTY. A product (NeoStudio…) replaces its content with its own
 * sources and excludes this path from its socle update (apply-update rsync), so updating the
 * socle never erases them. Decision Charles 17/11/2026 (CLAUDE-neosaas.md § Notifications):
 * generic model in the socle, product categories by registration — never edit the bell routes.
 *
 * Each source lists the CURRENT USER's own notifications (never another user's or company's),
 * and owns the read state of the ids it returns. Both bells (user and admin) merge them.
 * The matching display types (icon, label, toast rule) are registered client-side in
 * lib/notifications/product-types.ts (same extension rule).
 */
import type { ProductNotificationSource } from "@/lib/notifications/product-source-types"

export const productNotificationSources: ProductNotificationSource[] = []
