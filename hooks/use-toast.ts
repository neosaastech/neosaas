"use client"

/**
 * Legacy relay — DO NOT use in new code, call `notify` from "@/lib/notify".
 *
 * This file used to be the Radix toast store. Its <Toaster/> (components/ui/toaster.tsx)
 * was never mounted once the app moved to sonner, so every `toast({...})` from here was
 * silently dropped (SAAS-177, 17/11/2026). It now forwards to sonner through `notify`,
 * keeping the old signature so any call not yet migrated still shows its message.
 */
import type { ReactNode } from "react"
import { notify } from "@/lib/notify"

interface LegacyToast {
  title?: ReactNode
  description?: ReactNode
  variant?: "default" | "destructive" | null
  duration?: number
}

function show({ title, description, variant, duration }: LegacyToast, replaceId?: string | number) {
  const options = { description, duration, ...(replaceId !== undefined ? { id: replaceId } : {}) }
  return variant === "destructive" ? notify.error(title ?? "Erreur", options) : notify.message(title ?? "", options)
}

function toast(props: LegacyToast) {
  const id = show(props)
  return {
    id: String(id),
    dismiss: () => notify.dismiss(id),
    // Same id → sonner replaces the toast in place instead of stacking a new one.
    update: (next: LegacyToast) => show({ ...props, ...next }, id),
  }
}

function useToast() {
  return { toast, dismiss: (id?: string) => notify.dismiss(id), toasts: [] as never[] }
}

export { useToast, toast }
