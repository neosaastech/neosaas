import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import { and, asc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import { db } from "@/db"
import { pageLayers, pageSeo } from "@/db/schema"
import { BlockRenderer, type PageLayerRow } from "@/components/layers/block-renderer"
import { PreviewChrome } from "@/components/common/preview-chrome"
import { loadPreviewLayers } from "@/lib/pages/preview-layers"
import { buildPageMetadata } from "@/lib/seo/page-metadata"
import type { Locale } from "@/app/[locale]/layout"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  return buildPageMetadata({ pagePath: `/${slug.join("/")}`, locale: locale as Locale })
}

/**
 * Generic renderer for any page created via the Content Hub (Payload →
 * page_layers sync) whose path isn't one of the specific hardcoded routes
 * (/pricing, /legal/...) — those still win automatically, Next.js matches
 * a more specific static route before falling back to a catch-all.
 */
export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>
}) {
  const { locale, slug } = await params
  const pagePath = `/${slug.join("/")}`
  const { isEnabled: isPreview } = await draftMode()

  let layers: PageLayerRow[] = []
  let headerImageUrl: string | null = null

  if (isPreview) {
    layers = await loadPreviewLayers(pagePath, locale)
  } else {
    try {
      const [layerRows, seoRow] = await Promise.all([
        db.query.pageLayers.findMany({
          where: and(eq(pageLayers.pagePath, pagePath), eq(pageLayers.locale, locale), eq(pageLayers.isActive, true)),
          orderBy: asc(pageLayers.position),
        }),
        db.query.pageSeo
          .findFirst({
            where: and(eq(pageSeo.pagePath, pagePath), eq(pageSeo.locale, locale), eq(pageSeo.isActive, true)),
          })
          .catch(() => undefined),
      ])
      layers = layerRows
      headerImageUrl = seoRow?.headerImageUrl ?? null
    } catch (error) {
      console.error(`Failed to load page layers for ${pagePath}:`, error)
    }
  }

  if (layers.length === 0) {
    notFound()
  }

  return (
    <div className="container py-12 md:py-24">
      {isPreview && <PreviewChrome />}
      {/* Charles (2026-07-11): "laisse la possibilité au module d'afficher
          une telle image" — same banner treatment as blog/[slug]/page.tsx's
          coverImageUrl, sourced from the same header image the meta tags
          above (buildPageMetadata) already use. */}
      {headerImageUrl && (
        <img src={headerImageUrl} alt="" className="mb-8 aspect-video w-full rounded-xl object-cover" />
      )}
      <BlockRenderer layers={layers} pagePath={pagePath} locale={locale} />
    </div>
  )
}
