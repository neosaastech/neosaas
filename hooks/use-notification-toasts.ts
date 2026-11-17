"use client"

/**
 * useNotificationToasts — a notification that ARRIVES while the user is browsing is also
 * shown as a toast (SAAS-179, 17/11/2026, CLAUDE-neosaas.md § Notifications). It stays
 * unread in the bell until opened: the toast is a signal, the bell is the record.
 *
 * - The first successful load only memorises what is already there: no toast on page load.
 * - Only unread notifications never seen AND dated after the page load, whose type allows it
 *   (registry, current path), are shown.
 * - More than MAX_TOASTS at once → one summary toast instead of a burst.
 */
import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { notify } from "@/lib/notify"
import { shouldToastNotification, type BellNotification } from "@/lib/notifications/notification-types"

const MAX_TOASTS = 3
/** Tolerance between server and browser clocks. */
const CLOCK_SKEW_MS = 2 * 60 * 1000

/** No date → not announced: an undated item cannot be proven recent. */
function isAfter(timestamp: string | undefined, since: number): boolean {
  if (!timestamp) return false
  const t = new Date(timestamp).getTime()
  return Number.isFinite(t) && t >= since
}

export function useNotificationToasts<N extends BellNotification>(
  notifications: N[],
  onOpen: (notification: N) => void,
): void {
  const pathname = usePathname() ?? ""
  const seen = useRef<Set<string> | null>(null)
  const loadedAt = useRef(0)
  // The array the bell started with (its useState initial value) is not a load. Compared by
  // reference, so React strict mode re-running effects on mount does not count as one.
  const initial = useRef(notifications)
  // Latest handlers without re-running the effect on every render.
  const latest = useRef({ onOpen, pathname })
  useEffect(() => {
    latest.current = { onOpen, pathname }
  })

  useEffect(() => {
    if (notifications === initial.current) return
    if (seen.current === null) {
      seen.current = new Set(notifications.map((n) => n.id))
      loadedAt.current = Date.now()
      return
    }
    // « Never seen » is not « new »: the bell reads a window of the latest items, and an OLD
    // unread item slides into it when others are read or leave (17/11, dev: 1 037 old « Mission
    // complétée » resurfaced as toasts). Only events dated after the page load are announced.
    const since = loadedAt.current - CLOCK_SKEW_MS
    const fresh = notifications.filter(
      (n) =>
        !n.isRead &&
        !seen.current!.has(n.id) &&
        isAfter(n.timestamp, since) &&
        shouldToastNotification(n, latest.current.pathname),
    )
    notifications.forEach((n) => seen.current!.add(n.id))
    if (fresh.length === 0) return
    if (fresh.length > MAX_TOASTS) {
      notify.info(`${fresh.length} nouvelles notifications`, { description: "Ouvrez la cloche pour les consulter." })
      return
    }
    for (const n of fresh) {
      notify.info(n.title, {
        id: `bell-${n.id}`,
        description: n.description ? truncate(n.description, 140) : undefined,
        action: { label: "Voir", onClick: () => latest.current.onOpen(n) },
      })
    }
  }, [notifications])
}

function truncate(text: string, max: number): string {
  const plain = text.replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim()
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}
