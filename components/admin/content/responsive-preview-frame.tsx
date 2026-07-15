"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Monitor, Tablet, Smartphone } from "lucide-react"

type Viewport = "desktop" | "tablet" | "mobile"

const VIEWPORT_WIDTH: Record<Viewport, number | null> = {
  desktop: null, // null = 100% of the available preview area, no fixed px width
  tablet: 768,
  mobile: 375,
}

const VIEWPORTS: { value: Viewport; label: string; Icon: typeof Monitor }[] = [
  { value: "desktop", label: "Desktop", Icon: Monitor },
  { value: "tablet", label: "Tablet", Icon: Tablet },
  { value: "mobile", label: "Mobile", Icon: Smartphone },
]

/**
 * Charles (2026-07-15): "la version mobile et tablet n'active pas le
 * responsive, du coup on a un menu desktop coupé" — the first version of
 * this component just constrained a wrapping `<div>`'s max-width, but
 * Tailwind's `md:`/`lg:` breakpoints key off the actual BROWSER viewport
 * width, not a parent container's width (these are standard viewport media
 * queries, not CSS container queries) — shrinking the container only
 * clips the still-desktop layout instead of triggering the mobile one.
 * Real fix: render the preview inside an `<iframe>` sized to the chosen
 * width — the iframe has its own independent viewport, so the exact same
 * SiteHeader/SiteFooter/blocks genuinely re-layout for mobile/tablet
 * inside it, instead of merely being visually cropped.
 */
export function ResponsivePreviewFrame({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<Viewport>("desktop")
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeBody, setIframeBody] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    function setup() {
      const doc = iframe!.contentDocument
      if (!doc) return
      // Mirror the admin page's own stylesheets into the iframe — Next.js
      // injects Tailwind's compiled CSS as <link>/<style> tags in the host
      // document's <head>, which an iframe never inherits on its own.
      doc.head.innerHTML = window.document.head.innerHTML
      doc.body.style.margin = "0"
      setIframeBody(doc.body)
    }

    if (iframe.contentDocument?.readyState === "complete") setup()
    iframe.addEventListener("load", setup)
    return () => iframe.removeEventListener("load", setup)
  }, [])

  const width = VIEWPORT_WIDTH[viewport]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        {VIEWPORTS.map(({ value, label, Icon }) => (
          <Button
            key={value}
            type="button"
            variant={viewport === value ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            title={label}
            onClick={() => setViewport(value)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <div className="flex justify-center bg-muted/30 rounded-lg p-2">
        <iframe
          ref={iframeRef}
          title="Responsive preview"
          src="about:blank"
          style={{ width: width ? `${width}px` : "100%", height: 600, border: "none", background: "white" }}
          className="rounded"
        />
      </div>
      {iframeBody && createPortal(children, iframeBody)}
    </div>
  )
}
