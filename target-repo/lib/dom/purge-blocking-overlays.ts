export type PurgeBlockingOverlaysOptions = {
  /** Always strip Puck overlay portals — use on route change / builder unmount. */
  force?: boolean
}

/** Remove Puck/Preline/Radix overlay leftovers that block clicks on public pages. */
export function purgeBlockingOverlays(options?: PurgeBlockingOverlaysOptions) {
  if (typeof document === "undefined") return

  document.querySelectorAll("[data-resize-overlay]").forEach((el) => el.remove())
  document.querySelectorAll("[data-hs-overlay-backdrop-template], .hs-overlay-backdrop").forEach((el) => el.remove())
  document.body.classList.remove("hs-overlay-open", "hs-overlay-minified", "overflow-hidden")
  document.body.removeAttribute("data-puck-dragging")

  const onBuilder = window.location.pathname.includes("/admin/pilotage/builder")
  if (options?.force || !onBuilder) {
    document.querySelectorAll("[data-puck-overlay-portal], [data-puck-overlay]").forEach((el) => el.remove())
  }

  // Orphan Radix Sheet/Dialog backdrops after client navigation (mobile menu → Link).
  document.querySelectorAll('[data-radix-portal]').forEach((portal) => {
    const openOverlay = portal.querySelector('[data-state="open"][class*="inset-0"]')
    if (!openOverlay) return
    const hasOpenContent = portal.querySelector(
      '[role="dialog"][data-state="open"], [data-radix-dialog-content][data-state="open"]',
    )
    if (!hasOpenContent) portal.remove()
  })
}
