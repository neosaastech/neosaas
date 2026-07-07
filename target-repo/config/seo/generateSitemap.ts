import { eq } from "drizzle-orm"
import { db } from "@/db"
import { pageLayers } from "@/db/schema"
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
 * Payload). Pulls every active page_layers path and blog_posts slug, one
 * <url> per locale, alongside a small set of always-present static routes.
 */
export async function generateSitemapXml() {
  const config = await loadNeosaasConfig()
  const siteUrl = config.siteUrl || `https://${config.domain}`

  const staticPaths = ["/pricing"]

  const pages: SitemapUrl[] = [
    {
      loc: `${siteUrl}/`,
      changefreq: "weekly",
      priority: 1.0,
      images: [
        { loc: `${siteUrl}/public/clean-data-overview.png`, title: "Overview Clean Data" },
        { loc: `${siteUrl}/public/dashboard.jpg`, title: "Dashboard Screenshot" },
      ],
    },
  ]

  for (const locale of LOCALES) {
    for (const staticPath of staticPaths) {
      pages.push({
        loc: `${siteUrl}/${locale}${staticPath}`,
        changefreq: "monthly",
        priority: 0.8,
      })
    }
  }

  // CMS-authored pages (Payload -> page_layers), one entry per locale that
  // actually has active layers — a page only published in "en" shouldn't
  // produce a dead "fr" sitemap entry.
  const cmsPages = await db
    .selectDistinct({ pagePath: pageLayers.pagePath, locale: pageLayers.locale })
    .from(pageLayers)
    .where(eq(pageLayers.isActive, true))

  for (const page of cmsPages) {
    if (staticPaths.includes(page.pagePath)) continue
    pages.push({
      loc: `${siteUrl}/${page.locale}${page.pagePath}`,
      changefreq: "monthly",
      priority: 0.6,
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
