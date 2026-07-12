import Link from "next/link"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"
import { ArrowLeft } from "lucide-react"
import { getDocsSource } from "@/lib/docs/fumadocs-source"
import { getPlatformConfig } from "@/lib/config"
import { shouldShowLogoInHeader, shouldShowSiteNameInHeader } from "@/lib/logo-display"
import { BrandMark } from "@/components/common/brand-mark"
import { ThemeToggle } from "@/components/common/theme-toggle"

/**
 * Deliberately NOT nested under app/[locale]/(public) — that layout already
 * injects SiteHeader/SiteFooter/CookieConsent, which would double up with
 * DocsLayout's own nav/sidebar chrome. app/[locale]/layout.tsx (the only
 * layout above this one) is a thin passthrough, so this route gets Fumadocs'
 * shell and nothing else. Theme/search are disabled on RootProvider: the
 * site already has its own next-themes provider at the root, and no search
 * index exists yet (Charles, 2026-07-11: explicit "mode wiki exclusif" —
 * a minimal dedicated bar, not the full marketing header, but with a real
 * way back to the site).
 *
 * Charles (2026-07-12): two follow-ups on top of the first pass —
 * 1) the nav title was a one-off plain-text span instead of the same
 *    logo/site-name lockup already used at /dashboard — now shares
 *    BrandMark (extracted from PrivateSidebar) so it's visually the same
 *    component, not a re-implementation that can drift.
 * 2) fumadocs-ui's DocsLayout renders a DEFAULT sidebar footer (a search
 *    box + its own theme toggle) that is NOT governed by the `search`/
 *    `theme`/`searchToggle` props above — those only affect the nav bar.
 *    That default footer is what Charles saw: a search input that silently
 *    does nothing (no search provider registered) and a theme toggle that
 *    doesn't work (fumadocs' own theme context is intentionally disabled).
 *    `sidebar.footer` below replaces it with just the site's real,
 *    functional ThemeToggle — no search UI until an actual index exists.
 */
export default async function DocumentationLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}) {
  const { locale } = await params
  const [source, platformConfig] = await Promise.all([getDocsSource(locale), getPlatformConfig()])
  const { siteName, logo, logoDisplayMode } = platformConfig

  const navTitle = (
    <span className="inline-flex items-center gap-2">
      <BrandMark
        siteName={siteName}
        logo={logo}
        showLogo={shouldShowLogoInHeader(logoDisplayMode)}
        showSiteName={shouldShowSiteNameInHeader(logoDisplayMode)}
        size="sm"
      />
      <span className="text-fd-muted-foreground text-sm font-normal">Documentation</span>
    </span>
  )

  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsLayout
        tree={source.pageTree}
        nav={{ title: navTitle, url: `/${locale}/documentation` }}
        links={[{ type: "main", url: `/${locale}`, text: "Retour au site", icon: <ArrowLeft className="h-4 w-4" /> }]}
        searchToggle={{ enabled: false }}
        sidebar={{ footer: <ThemeToggle /> }}
      >
        {children}
        <footer className="mt-auto border-t px-4 py-6 md:px-6">
          <div className="flex flex-col items-center gap-3 text-sm text-fd-muted-foreground sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <BrandMark siteName={siteName} logo={logo} showLogo={shouldShowLogoInHeader(logoDisplayMode)} showSiteName={false} size="sm" />
              <span>© {new Date().getFullYear()} {siteName}. All rights reserved.</span>
            </div>
            <Link href={`/${locale}`} className="hover:text-fd-foreground transition-colors">
              {siteName}.tech
            </Link>
          </div>
        </footer>
      </DocsLayout>
    </RootProvider>
  )
}
