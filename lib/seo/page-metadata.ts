import type { Metadata } from "next"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { pageSeo } from "@/db/schema"
import { getPlatformConfig } from "@/lib/config"
import { LOCALES, type Locale } from "@/app/[locale]/layout"

/**
 * Per-page metadata for anything rendered through page_layers (the
 * catch-all [...slug] route and the home page) — reads the page's own
 * Payload-synced meta.title/meta.description (db/schema.ts's pageSeo)
 * first, falls back to the site-wide seoSettings (platform_config,
 * app/layout.tsx's generateMetadata) for anything a page hasn't set,
 * including OG image and site name — this never competes with that
 * system, it only overrides title/description per page (Charles,
 * 2026-07-08: "les balises og qui proviennent de notre système seo social
 * media").
 *
 * `pagePath` is the un-prefixed path ("/", "/pricing"), never
 * locale-prefixed — matches page_layers/page_seo's own `page_path` column.
 */
export async function buildPageMetadata({
  pagePath,
  locale,
  fallbackTitle,
  fallbackDescription,
}: {
  pagePath: string
  locale: Locale
  fallbackTitle?: string
  fallbackDescription?: string
}): Promise<Metadata> {
  const [config, seoRow] = await Promise.all([
    getPlatformConfig(),
    db.query.pageSeo
      .findFirst({
        where: and(eq(pageSeo.pagePath, pagePath), eq(pageSeo.locale, locale), eq(pageSeo.isActive, true)),
      })
      .catch(() => undefined),
  ])

  const seo = config.seoSettings || {}
  const title = seoRow?.metaTitle || fallbackTitle || seo.ogTitle || config.siteName
  const description = seoRow?.metaDescription || fallbackDescription || seo.description
  // Charles (2026-07-09): "on doit pouvoir ajouter le nom du site ou non
  // sur le SEO dans la balise title." app/layout.tsx's title.template
  // ('%s | SiteName') applies to every page automatically — title.absolute
  // is the documented Next.js escape hatch to render a page's title with
  // no template appended at all.
  const titleField = seoRow?.includeSiteNameInTitle === false ? { absolute: title } : title

  // Charles (2026-07-11): "on doit pouvoir intégrer cet élément qui
  // apparaîtra sur les SERP" — Payload's plugin-seo meta.image, synced onto
  // pageSeo.headerImageUrl, overrides the site-wide og:image the same way
  // metaTitle/metaDescription already override the site-wide title/description.
  const image = seoRow?.headerImageUrl || seo.ogImage

  // alternates.languages needs an absolute or root-relative URL per locale
  // — the home page's pagePath is "/", every other page keeps its own path
  // under each locale prefix (see app/[locale]/layout.tsx's LOCALES).
  const languages: Record<string, string> = {}
  for (const l of LOCALES) {
    languages[l] = pagePath === "/" ? `/${l}` : `/${l}${pagePath}`
  }

  return {
    title: titleField,
    description,
    alternates: { languages },
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      siteName: config.siteName,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}
