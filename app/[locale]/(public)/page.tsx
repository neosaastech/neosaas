import type { Metadata } from "next"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { pageSeo } from "@/db/schema"
import { PageRenderer } from "@/components/pages/page-renderer"
import { HomeFallback } from "@/components/pages/home-fallback"
import { buildPageMetadata } from "@/lib/seo/page-metadata"
import type { Locale } from "@/app/[locale]/layout"

// Was a static `metadata` export — always "Home" in English regardless of
// /fr vs /en, and ignored any title/description a real Payload home page
// set (Charles, 2026-07-08). generateMetadata resolves the same way every
// other page does now: Payload's page_seo first, this hardcoded copy only
// as the last-resort fallback when no home page has been published yet.

/**
 * Charles (2026-07-15): "un bouton cliquable qui détermine une page comme
 * page d'accueil de sa langue" — a Page's own `homeForLocale` choice
 * (Payload) syncs into page_seo.is_homepage. Falls back to the legacy
 * hardcoded "/" when no page has claimed this locale's home yet, so
 * existing sites keep working exactly as before until an editor opts in.
 */
async function resolveHomePagePath(locale: string): Promise<string> {
  const row = await db.query.pageSeo.findFirst({
    where: and(eq(pageSeo.locale, locale), eq(pageSeo.isHomepage, true), eq(pageSeo.isActive, true)),
    columns: { pagePath: true },
  })
  return row?.pagePath ?? "/"
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const pagePath = await resolveHomePagePath(locale)
  return buildPageMetadata({
    pagePath,
    locale: locale as Locale,
    fallbackTitle: "Home",
    fallbackDescription:
      "NeoSaaS provides all the tools you need to build, launch, and scale your SaaS business. User management, billing, analytics, and more.",
  })
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const pagePath = await resolveHomePagePath(locale)

  return (
    <PageRenderer
      pagePath={pagePath}
      locale={locale}
      fallback={<HomeFallback locale={locale} />}
      // Charles (2026-07-15): NOT `className="container ..."` — every block
      // is already wrapped in a full-bleed `<section className="w-full ...">`
      // (components/layers/block-wrapper.tsx) specifically so a block like
      // the hero can bleed its own background/gradient edge-to-edge; each
      // block manages its OWN inner content width (mx-auto max-w-*). Wrapping
      // the whole page in `container` here "fixed" the feature grid's missing
      // side margins by clipping every block's background to that width
      // instead — the real fix for that (features-list-layer.tsx too) is
      // giving those two specific layers their own max-w-*, done separately.
    />
  )
}
