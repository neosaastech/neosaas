"use client"

import { useRouter } from "next/navigation"
import { RefreshRouteOnSave } from "@payloadcms/live-preview-react"

/**
 * Wires Payload's official Live Preview refresh listener to Next.js's own
 * router — every keystroke in Payload's admin posts a message to this
 * iframe, which triggers `router.refresh()`, which re-runs the page's
 * server component and re-fetches the draft from Payload (see
 * [...slug]/page.tsx). This is the documented App Router pattern: no
 * client-side data merging needed, unlike the SPA-oriented useLivePreview
 * hook, because the page is already a server component reading fresh data.
 */
export function RefreshPreview() {
  const router = useRouter()
  return (
    <RefreshRouteOnSave
      refresh={() => router.refresh()}
      serverURL={process.env.NEXT_PUBLIC_PAYLOAD_URL || ""}
    />
  )
}
