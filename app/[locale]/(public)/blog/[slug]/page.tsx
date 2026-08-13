import { and, asc, eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { db } from "@/db"
import { blogPosts, pageLayers } from "@/db/schema"
import { BlockRenderer } from "@/components/layers/block-renderer"
import { buildPageTemplateContext, interpolateTemplateString } from "@/lib/pages/template-variables"
import { getPlatformConfig } from "@/lib/config"
import { LOCALES } from "@/app/[locale]/layout"
import { injectHeadingIds, extractHeadings, splitAfterFirstParagraph } from "@/lib/blog/toc"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { ShareButtons } from "@/components/blog/share-buttons"
import { AuthorBox } from "@/components/blog/author-box"
import { JsonLd } from "@/components/seo/json-ld"
import { buildBlogPostingJsonLd } from "@/lib/seo/structured-data"

// Never had any metadata at all before this — every article showed the
// site-wide title/description. Uses blog_posts' own meta_title/
// meta_description (synced from Payload's plugin-seo) with the post's own
// title/excerpt/cover as fallback, same "override the site-wide OG config,
// never replace it" rule as buildPageMetadata (lib/seo/page-metadata.ts) —
// separate here since blog_posts already has its own columns for this,
// not page_seo.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await db.query.blogPosts.findFirst({ where: eq(blogPosts.slug, slug) })
  if (!post || !post.isActive) return {}

  const config = await getPlatformConfig()
  const seo = config.seoSettings || {}
  const title = post.metaTitle || post.title
  const description = post.metaDescription || post.excerpt || seo.description
  const image = post.coverImageUrl || seo.ogImage
  // Same title.template bypass as buildPageMetadata (lib/seo/page-metadata.ts).
  const titleField = post.includeSiteNameInTitle === false ? { absolute: title } : title

  const languages: Record<string, string> = {}
  for (const l of LOCALES) languages[l] = `/${l}/blog/${slug}`

  return {
    title: titleField,
    description,
    alternates: { languages },
    // Same gap/fix as lib/seo/page-metadata.ts's buildPageMetadata.
    robots: { index: !post.noIndex, follow: !post.noFollow },
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      siteName: config.siteName,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

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
  const interpolatedBodyHtml = interpolateTemplateString(post.bodyHtml, templateContext)
  const bodyHtml = injectHeadingIds(interpolatedBodyHtml)
  const headings = extractHeadings(bodyHtml)
  const { before: firstParagraphHtml, after: restOfBodyHtml } = splitAfterFirstParagraph(bodyHtml)
  const canonicalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}/blog/${slug}`
  const bodyProseClass =
    "[&_a]:text-primary [&_a]:underline [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-6 [&_ul]:list-disc [&_ol]:list-decimal"

  const config = await getPlatformConfig()
  const seo = config.seoSettings || {}
  const baseUrl = seo.baseUrl || process.env.NEXT_PUBLIC_APP_URL || ""

  return (
    <article className="container max-w-3xl py-12 md:py-24">
      <JsonLd
        data={buildBlogPostingJsonLd({
          url: canonicalUrl,
          headline: post.title,
          description: post.metaDescription || post.excerpt,
          image: post.coverImageUrl,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          authorName: post.authorName,
          publisher: { siteName: config.siteName, baseUrl, logo: config.logo },
        })}
      />
      {headerLayer ? (
        <BlockRenderer layers={[headerLayer]} pagePath={`/blog/${slug}`} locale={locale} />
      ) : (
        <>
          {/* h1 first — the SEO-correct first element of the article, not preceded by the cover image. */}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
          {post.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImageUrl} alt="" className="mt-4 mb-4 aspect-video w-full rounded-xl object-cover" />
          )}
          <ShareButtons url={canonicalUrl} title={post.title} />
          {post.authorName && <AuthorBox name={post.authorName} bio={post.authorBio} avatarUrl={post.authorAvatarUrl} />}
        </>
      )}
      <div className={`mt-8 space-y-4 ${bodyProseClass}`} dangerouslySetInnerHTML={{ __html: firstParagraphHtml }} />
      <TableOfContents headings={headings} locale={locale} />
      <div className={`space-y-4 ${bodyProseClass}`} dangerouslySetInnerHTML={{ __html: restOfBodyHtml }} />
      {afterBodyLayers.length > 0 && (
        <div className="mt-12">
          <BlockRenderer layers={afterBodyLayers} pagePath={`/blog/${slug}`} locale={locale} />
        </div>
      )}
      {/*
        Fixed anchor, always present — NOT an editor-placed block. Lets an
        admin control what appears at the bottom of every article from one
        place (Modules, scoped page_type=article + locale), rather than
        either hardcoding a block here (can't turn it off/vary by locale) or
        adding it to every article's own layout one by one (doesn't scale,
        each edit only touches one post). Renders nothing if no Module
        targets this anchorKey yet.
      */}
      <div className="mt-12">
        <BlockRenderer
          layers={[{ id: "article-footer-anchor", layerType: "module-anchor", props: { anchorKey: "article-footer" } }]}
          pagePath={`/blog/${slug}`}
          locale={locale}
        />
      </div>
    </article>
  )
}
