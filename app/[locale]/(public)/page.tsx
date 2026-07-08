import type { Metadata } from "next"
import { PageRenderer } from "@/components/pages/page-renderer"
import { HomeFallback } from "@/components/pages/home-fallback"
import { buildPageMetadata } from "@/lib/seo/page-metadata"
import type { Locale } from "@/app/[locale]/layout"

// Was a static `metadata` export — always "Home" in English regardless of
// /fr vs /en, and ignored any title/description a real Payload home page
// set (Charles, 2026-07-08). generateMetadata resolves the same way every
// other page does now: Payload's page_seo first, this hardcoded copy only
// as the last-resort fallback when no home page has been published yet.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return buildPageMetadata({
    pagePath: "/",
    locale: locale as Locale,
    fallbackTitle: "Home",
    fallbackDescription:
      "NeoSaaS provides all the tools you need to build, launch, and scale your SaaS business. User management, billing, analytics, and more.",
  })
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <PageRenderer
      pagePath="/"
      locale={locale}
      fallback={<HomeFallback locale={locale} />}
    />
  )
}
