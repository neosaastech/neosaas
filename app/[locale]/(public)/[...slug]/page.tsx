import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import { draftMode } from "next/headers"
import { and, asc, desc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import { db } from "@/db"
import { blogPosts, categories, pageLayers, pageSeo } from "@/db/schema"
import { BlockRenderer, type PageLayerRow } from "@/components/layers/block-renderer"
import { PreviewChrome } from "@/components/common/preview-chrome"
import { loadPreviewLayers } from "@/lib/pages/preview-layers"
import { buildPageMetadata } from "@/lib/seo/page-metadata"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Locale } from "@/app/[locale]/layout"
import { JsonLd } from "@/components/seo/json-ld"
import { buildWebPageJsonLd } from "@/lib/seo/structured-data"

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
  let seoRowForJsonLd: typeof pageSeo.$inferSelect | undefined

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
      seoRowForJsonLd = seoRow
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

  // SAAS-142: a Category has no page_layers row of its own (it isn't a
  // Page) — its path was 404ing here even though category-list-layer.tsx
  // already links to it (`href={category.path}`) and the sync side
  // (categories/blog_posts tables) has worked since 2026-07-11. Only
  // checked once the normal Pages lookup comes up empty, so an actual Page
  // at this exact path still wins.
  if (layers.length === 0 && !isPreview) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.path, pagePath), eq(categories.locale, locale), eq(categories.isActive, true)),
    })
    if (category) {
      const posts = await db.query.blogPosts.findMany({
        where: and(eq(blogPosts.categoryPath, pagePath), eq(blogPosts.locale, locale), eq(blogPosts.isActive, true)),
        orderBy: [desc(blogPosts.publishedAt)],
      })
      return (
        <div className="container py-12 md:py-24">
          {category.headerImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={category.headerImageUrl} alt="" className="mb-8 aspect-video w-full rounded-xl object-cover" />
          )}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{category.name}</h1>
          {category.description && (
            <div
              className="mt-4 max-w-2xl text-muted-foreground [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: category.description }}
            />
          )}
          {posts.length > 0 && (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.slug} href={`/${locale}/blog/${post.slug}`}>
                  <Card className="h-full overflow-hidden py-0">
                    {post.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.coverImageUrl} alt="" className="aspect-video w-full object-cover" />
                    )}
                    <CardHeader className="py-6">
                      <CardTitle>{post.title}</CardTitle>
                      {post.excerpt && <CardDescription>{post.excerpt}</CardDescription>}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }
  }

  if (layers.length === 0) {
    notFound()
  }

  const canonicalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}${pagePath}`

  return (
    <>
      {!isPreview && seoRowForJsonLd && (
        <JsonLd
          data={buildWebPageJsonLd({
            url: canonicalUrl,
            name: seoRowForJsonLd.metaTitle || seoRowForJsonLd.title || pagePath,
            description: seoRowForJsonLd.metaDescription,
            isArticle: seoRowForJsonLd.pageType === "article",
            datePublished: seoRowForJsonLd.createdAt,
            dateModified: seoRowForJsonLd.updatedAt,
          })}
        />
      )}
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
