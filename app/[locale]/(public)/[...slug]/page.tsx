import { notFound } from "next/navigation"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/db"
import { pageLayers } from "@/db/schema"
import { BlockRenderer } from "@/components/layers/block-renderer"

/**
 * Generic renderer for any page created via the Content Hub (Payload →
 * page_layers sync) whose path isn't one of the specific hardcoded routes
 * (/features, /pricing, /blog...) — those still win automatically, Next.js
 * matches a more specific static route before falling back to a catch-all.
 *
 * Found 2026-07-04: Charles published a page at /uuiuo and got a 404 — the
 * whole page-builder pipeline (Payload → page_layers) only ever had ONE
 * page actually wired to render (/features, a one-off hardcoded route),
 * nothing generic existed for a genuinely new path. This is that missing
 * piece, not a new feature — the page builder was never actually "any page
 * you create shows up" until now.
 */
export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>
}) {
  const { locale, slug } = await params
  const pagePath = `/${slug.join("/")}`

  let layers: { id: string; layerType: string; props: unknown }[] = []
  try {
    layers = await db.query.pageLayers.findMany({
      where: and(eq(pageLayers.pagePath, pagePath), eq(pageLayers.locale, locale), eq(pageLayers.isActive, true)),
      orderBy: asc(pageLayers.position),
    })
  } catch (error) {
    console.error(`Failed to load page layers for ${pagePath}:`, error)
  }

  if (layers.length === 0) {
    notFound()
  }

  return (
    <div className="container py-12 md:py-24">
      <BlockRenderer layers={layers} pagePath={pagePath} />
    </div>
  )
}
