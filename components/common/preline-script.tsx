"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Initializes Preline's interactive behavior (dropdowns, mobile nav toggles,
 * accordions, tabs, tooltips...) and re-runs it on every App Router
 * navigation. Preline's own `HSStaticMethods.autoInit()` only fires once, on
 * the initial `DOMContentLoaded` — a client-side <Link> navigation never
 * refires that event, so a Preline component rendered on a page reached via
 * client navigation (not a full reload) would stay inert without this.
 */
export function PrelineScript() {
  const pathname = usePathname()

  useEffect(() => {
    import("preline").then(() => {
      (window as unknown as { HSStaticMethods: { autoInit: () => void } }).HSStaticMethods.autoInit()
    })
  }, [pathname])

  return null
}
