import { notFound } from "next/navigation"
import { and, asc, eq } from "drizzle-orm"
import { DocsPage, DocsBody, DocsTitle } from "fumadocs-ui/layouts/docs/page"
import { db } from "@/db"
import { pageLayers } from "@/db/schema"
import { BlockRenderer, type PageLayerRow } from "@/components/layers/block-renderer"
import { DOCS_BASE_PATH, getDocsSource } from "@/lib/docs/fumadocs-source"

/**
 * Fumadocs only ever supplies the navigation shell (tree/title) here — the
 * actual content is the same page_layers + BlockRenderer pipeline every
 * other public page uses (see (public)/[...slug]/page.tsx), just wrapped in
 * DocsPage/DocsBody instead of a plain container so it picks up the
 * sidebar-aware typography and breadcrumb.
 */
export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ locale: string; slug?: string[] }>
}) {
  const { locale, slug } = await params
  const pagePath = slug && slug.length > 0 ? `${DOCS_BASE_PATH}/${slug.join("/")}` : DOCS_BASE_PATH

  const source = await getDocsSource(locale)
  const docPage = source.getPage(slug)
  if (!docPage) notFound()

  let layers: PageLayerRow[] = []
  try {
    layers = await db.query.pageLayers.findMany({
      where: and(eq(pageLayers.pagePath, pagePath), eq(pageLayers.locale, locale), eq(pageLayers.isActive, true)),
      orderBy: asc(pageLayers.position),
    })
  } catch (error) {
    console.error(`Failed to load page layers for ${pagePath}:`, error)
  }

  if (layers.length === 0) notFound()

  return (
    <DocsPage toc={[]}>
      <DocsTitle>{docPage.data.title}</DocsTitle>
      <DocsBody>
        <BlockRenderer layers={layers} pagePath={pagePath} locale={locale} />
      </DocsBody>
    </DocsPage>
  )
}
