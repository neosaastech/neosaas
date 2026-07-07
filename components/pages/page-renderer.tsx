import type { ReactNode } from "react"
import { draftMode } from "next/headers"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/db"
import { pageLayers } from "@/db/schema"
import { BlockRenderer } from "@/components/layers/block-renderer"
import { PreviewChrome } from "@/components/common/preview-chrome"
import { isOfflineDev } from "@/lib/dev/offline-mode"
import { buildHomeLayers } from "@/lib/pages/home-content"
import { loadPreviewLayers } from "@/lib/pages/preview-layers"

interface PageRendererProps {
  pagePath: string
  locale: string
  fallback: ReactNode
  className?: string
}

function offlineLayersForPath(pagePath: string, locale: string) {
  if (pagePath === "/") {
    return buildHomeLayers(locale).map((layer, index) => ({
      id: `offline-home-${index}`,
      layerType: layer.layerType,
      props: layer.props,
    }))
  }
  return []
}

export async function PageRenderer({ pagePath, locale, fallback, className }: PageRendererProps) {
  const { isEnabled: isPreview } = await draftMode()

  if (isPreview) {
    const layers = await loadPreviewLayers(pagePath, locale)
    return (
      <div className={className}>
        <PreviewChrome />
        {layers.length > 0 ? (
          <BlockRenderer layers={layers} pagePath={pagePath} locale={locale} />
        ) : (
          <div className="container py-16 text-center text-muted-foreground">
            Aucun brouillon trouvé pour cette page dans Payload.
          </div>
        )}
      </div>
    )
  }

  if (isOfflineDev()) {
    const offlineLayers = offlineLayersForPath(pagePath, locale)
    return (
      <div className={className}>
        {offlineLayers.length > 0 ? (
          <BlockRenderer layers={offlineLayers} pagePath={pagePath} locale={locale} />
        ) : (
          fallback
        )}
      </div>
    )
  }

  let layers: { id: string; layerType: string; props: unknown }[] = []

  try {
    layers = await db.query.pageLayers.findMany({
      where: and(
        eq(pageLayers.pagePath, pagePath),
        eq(pageLayers.locale, locale),
        eq(pageLayers.isActive, true),
      ),
      orderBy: asc(pageLayers.position),
    })
  } catch (error) {
    console.error(`Failed to load page layers for ${pagePath}:`, error)
  }

  return (
    <div className={className}>
      {layers.length === 0 ? fallback : <BlockRenderer layers={layers} pagePath={pagePath} locale={locale} />}
    </div>
  )
}
