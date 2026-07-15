import { notFound, permanentRedirect } from "next/navigation"
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
  let isHomepage = false

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
      isHomepage = seoRow?.isHomepage ?? false
    } catch (error) {
      console.error(`Failed to load page layers for ${pagePath}:`, error)
    }
  }

  // Charles (2026-07-15): "/fr et /fr/accueil sont les mêmes page, on risque
  // d'avoir du duplicate content" — a page flagged as this locale's home
  // (Payload's homeForLocale, synced to page_seo.is_homepage) is served at
  // BOTH its own path (this catch-all route) and at "/" (app/[locale]/
  // (public)/page.tsx's resolveHomePagePath) — two indexable URLs for
  // identical content. Canonical fix: redirect the "long" URL to the real
  // home, permanently (308) so search engines consolidate on one. Must sit
  // OUTSIDE the try/catch above — permanentRedirect throws a framework-
  // recognized error that a generic catch would otherwise swallow.
  if (isHomepage) {
    permanentRedirect(`/${locale}`)
  }

  if (layers.length === 0) {
    notFound()
  }

  return (
    <>
      {/* Charles (2026-07-15): NOT a `container` wrapper around BlockRenderer
          — every block is already wrapped in a full-bleed `<section
          className="w-full ...">` (components/layers/block-wrapper.tsx) so a
          block like the hero can bleed its own background/gradient
          edge-to-edge; each block manages its OWN inner content width
          (mx-auto max-w-*). This div used to wrap everything, clipping any
          full-bleed block's background to `container` width — the exact
          same regression briefly reintroduced on the home route (app/
          [locale]/(public)/page.tsx), reverted there for the same reason. */}
      {(isPreview || headerImageUrl) && (
        <div className="container pt-12 md:pt-24">
          {isPreview && <PreviewChrome />}
          {/* Charles (2026-07-11): "laisse la possibilité au module d'afficher
              une telle image" — same banner treatment as blog/[slug]/page.tsx's
              coverImageUrl, sourced from the same header image the meta tags
              above (buildPageMetadata) already use. */}
          {headerImageUrl && (
            <img src={headerImageUrl} alt="" className="mb-8 aspect-video w-full rounded-xl object-cover" />
          )}
        </div>
      )}
      <BlockRenderer layers={layers} pagePath={pagePath} locale={locale} />
    </>
  )
}
