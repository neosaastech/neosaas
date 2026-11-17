"use client"

/**
 * notify — the ONE way to show a transient message (toast) in the app.
 *
 * Decision (Charles, 17/11/2026 — CLAUDE-neosaas.md § Notifications, Plane SAAS-177):
 * a single toast system, sonner, mounted once in app/layout.tsx (<Toaster/> from
 * components/ui/sonner). Until then three systems coexisted (sonner, Radix useToast,
 * a react-hot-toast mention) and only sonner was mounted — every screen calling the Radix
 * useToast() silently showed nothing (password recovery, payment methods, ToS acceptance…).
 *
 * Rules:
 * - Call notify.success / error / info / warning (or notify.message for a neutral one).
 *   Never import from "sonner" directly in a screen, never mount a second <Toaster/>.
 * - A durable event a user must be able to find again is NOT a toast: it is a notification
 *   (bell). The bell shows a toast when a new one arrives (SAAS-179).
 * - Durations are fixed here, so every screen behaves the same: errors stay longer.
 */
import type { ReactNode } from "react"
import { toast } from "sonner"

export interface NotifyOptions {
  description?: ReactNode
  /** Overrides the default duration for this kind, in ms. */
  duration?: number
  /** Optional single action button (e.g. "Voir", "Annuler"). */
  action?: { label: string; onClick: () => void }
  /** Reusing an id replaces the toast instead of stacking a new one. */
  id?: string | number
}

export const NOTIFY_DURATIONS = {
  message: 4000,
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
} as const

type Kind = keyof typeof NOTIFY_DURATIONS

function show(kind: Kind, title: ReactNode, options: NotifyOptions = {}) {
  const { duration, ...rest } = options
  const opts = { duration: duration ?? NOTIFY_DURATIONS[kind], ...rest }
  switch (kind) {
    case "success":
      return toast.success(title, opts)
    case "info":
      return toast.info(title, opts)
    case "warning":
      return toast.warning(title, opts)
    case "error":
      return toast.error(title, opts)
    default:
      return toast(title, opts)
  }
}

export const notify = {
  message: (title: ReactNode, options?: NotifyOptions) => show("message", title, options),
  success: (title: ReactNode, options?: NotifyOptions) => show("success", title, options),
  info: (title: ReactNode, options?: NotifyOptions) => show("info", title, options),
  warning: (title: ReactNode, options?: NotifyOptions) => show("warning", title, options),
  error: (title: ReactNode, options?: NotifyOptions) => show("error", title, options),
  /** Persistent spinner; pass its id to a later success/error to replace it in place. */
  loading: (title: ReactNode, options?: Omit<NotifyOptions, "duration">) => toast.loading(title, options),
  /** Loading → success / error on a promise, with the same durations. */
  promise: toast.promise,
  dismiss: (id?: string | number) => toast.dismiss(id),
}
