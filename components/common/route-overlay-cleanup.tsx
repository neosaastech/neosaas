"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { purgeBlockingOverlays } from "@/lib/dom/purge-blocking-overlays"

/**
 * After client-side navigation, remove Puck/Preline/Radix portal leftovers
 * that survived the previous route (e.g. mobile Sheet backdrop after a Link click).
 */
export function RouteOverlayCleanup() {
  const pathname = usePathname()

  useEffect(() => {
    purgeBlockingOverlays({ force: true })
  }, [pathname])

  return null
}
