/**
 * Notification display types — registry shared by both bells (SAAS-179, 17/11/2026).
 *
 * The socle declares its own types below. A product built on the socle (NeoStudio,
 * Neo Invoice…) adds its own with registerNotificationType() from its OWN code — it never
 * edits this file (CLAUDE-neosaas.md § Notifications: generic model in the socle, product
 * categories by registration). Unknown types fall back to "system".
 *
 * Not to be confused with lib/services/notification-category.ts (info / action / urgent,
 * derived from the subject): that is the urgency of a notification, this is what it is about.
 */
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Calendar, CreditCard, MessageSquare, Package, Settings, User } from "lucide-react"
import { registerProductNotificationTypes } from "@/lib/notifications/product-types"

export interface BellNotification {
  id: string
  type: string
  title: string
  description?: string
  /** ISO date of the event. A toast is only shown for events newer than the page load. */
  timestamp?: string
  isRead: boolean
  metadata?: Record<string, unknown>
}

export interface NotificationTypeConfig {
  icon: LucideIcon
  /** Tailwind classes for the icon colour and its badge background. */
  color: string
  bg: string
  label: string
  /**
   * Show a toast when a notification of this type arrives while the user is browsing.
   * A function lets a product skip it when the user is already looking at the thing
   * (e.g. the conversation the reply belongs to). Default: true.
   */
  toast?: boolean | ((notification: BellNotification, pathname: string) => boolean)
}

const registry = new Map<string, NotificationTypeConfig>()

export function registerNotificationType(type: string, config: NotificationTypeConfig): void {
  registry.set(type, config)
}

export function getNotificationType(type: string): NotificationTypeConfig {
  return registry.get(type) ?? registry.get("system")!
}

export function shouldToastNotification(notification: BellNotification, pathname: string): boolean {
  const rule = getNotificationType(notification.type).toast
  if (rule === undefined) return true
  return typeof rule === "function" ? rule(notification, pathname) : rule
}

// ── Socle types ────────────────────────────────────────────────────────────────
registerNotificationType("order", { icon: Package, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Commandes" })
registerNotificationType("appointment", { icon: Calendar, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", label: "Rendez-vous" })
registerNotificationType("payment", { icon: CreditCard, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", label: "Paiements" })
registerNotificationType("user", { icon: User, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", label: "Utilisateurs" })
registerNotificationType("profile_update", { icon: User, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", label: "Profils" })
registerNotificationType("settings", { icon: Settings, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-900/30", label: "Réglages" })
registerNotificationType("subscription", { icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Abonnements" })
registerNotificationType("support", { icon: MessageSquare, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/30", label: "Support" })
registerNotificationType("system", { icon: Settings, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-900/30", label: "Système" })
// Content sync failures (Payload → site, CLAUDE-content-manager.md § 8): red, they need fixing.
registerNotificationType("content", { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", label: "Contenu" })

// ── Product types (extension point, see lib/notifications/product-types.ts) ────────
registerProductNotificationTypes(registerNotificationType)
