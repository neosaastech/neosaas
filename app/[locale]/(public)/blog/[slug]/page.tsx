import { and, asc, eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { db } from "@/db"
import { blogPosts, pageLayers } from "@/db/schema"
import { BlockRenderer } from "@/components/layers/block-renderer"
import { buildPageTemplateContext, interpolateTemplateString } from "@/lib/pages/template-variables"

/**
 * Cover/title/author/body stay this fixed template (proven, low-risk) —
 * `layout` only ever adds *extra* sections around it, composed from the same
 * blocks Pages uses (Charles, 2026-07-06: "comment insérer des éléments
 * dynamiques" — v1 answer: optional page_layers rows keyed by this post's
 * own `/blog/{slug}` path, same mechanism as Pages, not a new one).
 */
export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const post = await db.query.blogPosts.findFirst({ where: eq(blogPosts.slug, slug) })

  if (!post || !post.isActive) notFound()

  const extraLayers = await db.query.pageLayers.findMany({
    where: and(eq(pageLayers.pagePath, `/blog/${slug}`), eq(pageLayers.locale, locale), eq(pageLayers.isActive, true)),
    orderBy: asc(pageLayers.position),
  })

  // An 'article-header' block, if present, always renders first — replacing
  // the fixed cover/title/author below (never both, to avoid a duplicate
  // header) — everything else in `layout` renders after the body, in the
  // order an editor placed it. Simple, predictable rule for a first version;
  // revisit if editors actually need a header interleaved elsewhere.
  const headerLayer = extraLayers.find((layer) => layer.layerType === "article-header")
  const afterBodyLayers = extraLayers.filter((layer) => layer.layerType !== "article-header")

  const templateContext = await buildPageTemplateContext(locale)
  const bodyHtml = interpolateTemplateString(post.bodyHtml, templateContext)

  return (
    <article className="container max-w-3xl py-12 md:py-24">
      {headerLayer ? (
        <BlockRenderer layers={[headerLayer]} pagePath={`/blog/${slug}`} />
      ) : (
        <>
          {post.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImageUrl} alt="" className="mb-8 aspect-video w-full rounded-xl object-cover" />
          )}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
          {post.authorName && <p className="mt-2 text-sm text-muted-foreground">Par {post.authorName}</p>}
        </>
      )}
      <div
        className="mt-8 space-y-4 [&_a]:text-primary [&_a]:underline [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-6 [&_ul]:list-disc [&_ol]:list-decimal"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
      {afterBodyLayers.length > 0 && (
        <div className="mt-12">
          <BlockRenderer layers={afterBodyLayers} pagePath={`/blog/${slug}`} />
        </div>
      )}
    </article>
  )
}
