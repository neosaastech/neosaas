import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { pageSeo, blogPosts, categories } from "@/db/schema"
import { loadNeosaasConfig } from "@/server/loadConfig"
import { LOCALES } from "@/app/[locale]/layout"

interface SitemapUrl {
  loc: string
  changefreq: string
  priority: number
  images?: { loc: string; title: string }[]
}

/**
 * Real sitemap, not a hardcoded list (found 2026-07-04: the previous version
 * only ever listed 4 fixed URLs — including a "/contact" page that doesn't
 * exist — and never picked up pages created through the Content Hub /
 * Payload). Pulls every active page, blog post, and category, one <url>
 * per locale, alongside a small set of always-present static routes.
 *
 * Charles (2026-07-13): "le sitemap doit récupérer toutes les pages
 * indexées" — this previously only ever queried page_layers (Pages),
 * despite the comment above already claiming blog_posts was included.
 * Now also queries blog_posts and categories, and excludes anything
 * flagged noIndex (a page search engines are told not to index shouldn't
 * also be listed in the sitemap asking them to crawl it — same fields
 * lib/seo/page-metadata.ts's buildPageMetadata reads for the actual
 * <meta name="robots"> tag).
 */
export async function generateSitemapXml() {
  const config = await loadNeosaasConfig()
  const siteUrl = config.siteUrl || `https://${config.domain}`

  const staticPaths = ["/pricing"]

  // Charles (2026-07-15): "un bouton cliquable qui détermine une page comme
  // page d'accueil de sa langue" — a locale's homepage can now be a
  // genuinely different Page (different internal pagePath) than another
  // locale's (page_seo.isHomepage, synced from Payload's Pages.homeForLocale).
  // The sitemap keeps exposing a clean canonical `/{locale}/` URL regardless
  // of which internal path actually backs it.
  const pages: SitemapUrl[] = LOCALES.map((locale) => ({
    loc: `${siteUrl}/${locale}/`,
    changefreq: "weekly",
    priority: 1.0,
    images: [
      { loc: `${siteUrl}/public/clean-data-overview.png`, title: "Overview Clean Data" },
      { loc: `${siteUrl}/public/dashboard.jpg`, title: "Dashboard Screenshot" },
    ],
  }))

  for (const locale of LOCALES) {
    for (const staticPath of staticPaths) {
      pages.push({
        loc: `${siteUrl}/${locale}${staticPath}`,
        changefreq: "monthly",
        priority: 0.8,
      })
    }
  }

  // CMS-authored pages (Payload -> page_seo), one entry per locale that's
  // actually active and not flagged noIndex.
  const cmsPages = await db
    .select({ pagePath: pageSeo.pagePath, locale: pageSeo.locale, isHomepage: pageSeo.isHomepage })
    .from(pageSeo)
    .where(and(eq(pageSeo.isActive, true), eq(pageSeo.noIndex, false)))

  for (const page of cmsPages) {
    // Whichever page is this locale's homepage is already covered by the
    // canonical `/{locale}/` entry above (its own internal pagePath may not
    // even be "/" anymore) — and "/pricing" is a static route — both would
    // otherwise appear twice, once here and once above.
    if (page.isHomepage || staticPaths.includes(page.pagePath)) continue
    pages.push({
      loc: `${siteUrl}/${page.locale}${page.pagePath}`,
      changefreq: "monthly",
      priority: 0.6,
    })
  }

  // Blog posts — slug is globally unique (one row, not one per locale), but
  // both /fr/blog/[slug] and /en/blog/[slug] serve it (locale only picks
  // which translation of the content renders), so one <url> per locale.
  const cmsPosts = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(and(eq(blogPosts.isActive, true), eq(blogPosts.noIndex, false)))

  for (const post of cmsPosts) {
    for (const locale of LOCALES) {
      pages.push({
        loc: `${siteUrl}/${locale}/blog/${post.slug}`,
        changefreq: "monthly",
        priority: 0.6,
      })
    }
  }

  // Categories — same per-(path, locale)-row shape as page_seo, no noIndex
  // concept (categories aren't individually flaggable in Payload today).
  const cmsCategories = await db
    .select({ path: categories.path, locale: categories.locale })
    .from(categories)
    .where(eq(categories.isActive, true))

  for (const category of cmsCategories) {
    pages.push({
      loc: `${siteUrl}/${category.locale}${category.path}`,
      changefreq: "monthly",
      priority: 0.5,
    })
  }

  const urls = pages
    .map((page) => {
      const images = page.images
        ? page.images
            .map(
              (img) => `
        <image:image>
          <image:loc>${img.loc}</image:loc>
          <image:title>${img.title}</image:title>
        </image:image>
      `,
            )
            .join("")
        : ""

      return `
    <url>
      <loc>${page.loc}</loc>
      <changefreq>${page.changefreq}</changefreq>
      <priority>${page.priority}</priority>
      ${images}
    </url>
    `.trim()
    })
    .join("\n")

  return `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
  `.trim()
}
