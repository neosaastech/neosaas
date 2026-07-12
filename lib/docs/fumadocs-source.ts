import { dynamicLoader } from "fumadocs-core/source/dynamic"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { pageSeo } from "@/db/schema"

/**
 * All pages under this Payload path prefix become Fumadocs docs pages —
 * matches the /documentation route below. Content itself (blocks) isn't
 * read here at all: this only feeds Fumadocs' navigation tree (sidebar,
 * breadcrumbs, prev/next), the page body is rendered separately by
 * BlockRenderer against page_layers, same as every other public page.
 */
export const DOCS_BASE_PATH = "/documentation"

/**
 * Turns a Payload page's real URL path into the virtual file path Fumadocs'
 * tree builder expects (folder-nesting = URL hierarchy, exactly mirroring
 * computeTreePath's guarantee on the Payload side that a child's path is
 * always a strict prefix-extension of its parent's — see payload-cms's
 * computeTreePath hook). `/documentation` itself becomes the root index;
 * `/documentation/blocs-de-contenu` becomes `blocs-de-contenu.mdx`, and any
 * future grandchild `/documentation/blocs-de-contenu/hero` would become
 * `blocs-de-contenu/hero.mdx`, nesting automatically — no separate
 * parentPath field needed.
 */
function toVirtualPath(pagePath: string): string {
  if (pagePath === DOCS_BASE_PATH) return "index.mdx"
  return `${pagePath.slice(DOCS_BASE_PATH.length + 1)}.mdx`
}

/**
 * `pageType === 'documentation'` (Payload's Pages.pageType, editor-set) is
 * the authoritative signal for wiki membership — replaces an earlier
 * `pagePath LIKE '/documentation%'` guess that had no editor visibility and
 * could silently misclassify any page whose path happened to share that
 * prefix. The path-prefix check below is kept only as a structural
 * safety net for toVirtualPath's slicing (a documentation-typed page with
 * a parent chain that doesn't actually resolve under /documentation is a
 * real misconfiguration — silently excluded rather than crashing, same
 * "skip the bad row" philosophy as BlockRenderer's malformed-block guard).
 */
async function fetchDocsFiles(locale: string) {
  const rows = await db.query.pageSeo.findMany({
    where: and(
      eq(pageSeo.isActive, true),
      eq(pageSeo.locale, locale),
      eq(pageSeo.pageType, "documentation"),
    ),
  })

  return rows
    .filter((row) => row.pagePath === DOCS_BASE_PATH || row.pagePath.startsWith(`${DOCS_BASE_PATH}/`))
    .map((row) => ({
      type: "page" as const,
      path: toVirtualPath(row.pagePath),
      data: {
        title: row.title ?? row.pagePath,
      },
    }))
}

/**
 * Fresh loader per request, scoped to the request's locale — mirrors the
 * rest of the public site's `force-dynamic` pattern (see
 * (public)/layout.tsx) rather than a cached module-level singleton, so a
 * newly published doc page appears immediately without a revalidate call.
 */
export async function getDocsSource(locale: string) {
  const loader = dynamicLoader(
    { files: () => fetchDocsFiles(locale) },
    { baseUrl: DOCS_BASE_PATH },
  )
  return loader.get()
}
