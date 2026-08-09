import { headers } from "next/headers"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"
import { ArrowLeft } from "lucide-react"
import { getDocsSource } from "@/lib/docs/fumadocs-source"
import { getPlatformConfig } from "@/lib/config"
import { getFooterConfig } from "@/app/actions/site-nav"
import { shouldShowLogoInHeader, shouldShowSiteNameInHeader } from "@/lib/logo-display"
import { BrandMark } from "@/components/common/brand-mark"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { SiteFooter } from "@/components/layout/site-footer"

/**
 * Deliberately NOT nested under app/[locale]/(public) — that layout already
 * injects SiteHeader/SiteFooter/CookieConsent, which would double up with
 * DocsLayout's own nav/sidebar chrome (still true for the header/sidebar).
 * app/[locale]/layout.tsx (the only layout above this one) is a thin
 * passthrough, so this route gets Fumadocs' shell for nav/sidebar. Theme/
 * search are disabled on RootProvider: the site already has its own
 * next-themes provider at the root, and no search index exists yet
 * (Charles, 2026-07-11: explicit "mode wiki exclusif" — a minimal dedicated
 * bar, not the full marketing header, but with a real way back to the
 * site).
 *
 * Footer (2026-08-09): the bottom chrome doesn't carry the same "avoid
 * doubling the marketing header" reasoning — the docs footer had been left
 * as a hardcoded English-only stub since the initial "wiki mode" pass,
 * never actually finished. Charles: reuse the real site-wide Footer (same
 * Payload-configured content, legal links, scoping) instead of maintaining
 * a second, permanently-half-built one. Resolved with the same
 * pagePath+locale scoping app/[locale]/(public)/layout.tsx uses, off the
 * same `x-pathname` header stamped by proxy.ts (this route is covered by
 * proxy.ts's matcher, confirmed — nothing docs-specific excludes it).
 *
 * Charles (2026-07-12): two follow-ups on top of the first pass —
 * 1) the nav title was a one-off plain-text span instead of the same
 *    logo/site-name lockup already used at /dashboard — now shares
 *    BrandMark (extracted from PrivateSidebar) so it's visually the same
 *    component, not a re-implementation that can drift.
 * 2) fumadocs-ui's Sidebar renders its OWN default theme-switch button
 *    (slots.themeSwitch, from the top-level `themeSwitch` prop — a
 *    SEPARATE gate from `search`/`theme` on RootProvider, easy to miss)
 *    independent of whatever `sidebar.footer` renders — the first pass
 *    added a working ThemeToggle via `sidebar.footer` but never actually
 *    disabled the broken default, so both showed up side by side
 *    (confirmed via the live DOM: two buttons, "Toggle Theme" and "Toggle
 *    theme"). `themeSwitch={{ enabled: false }}` below removes fumadocs'
 *    own broken one; `sidebar.footer` still supplies the real one. Search
 *    was already correctly disabled by `searchToggle={{ enabled: false }}`
 *    — no search UI renders at all (verified via the accessibility tree,
 *    not just a screenshot).
 */
export default async function DocumentationLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}) {
  const { locale } = await params
  const rawPathname = (await headers()).get("x-pathname") ?? `/${locale}/documentation`
  const pagePath = rawPathname === `/${locale}` ? "/" : rawPathname.slice(`/${locale}`.length) || "/"
  const [source, platformConfig, footerConfig] = await Promise.all([
    getDocsSource(locale),
    getPlatformConfig(),
    getFooterConfig(pagePath, locale),
  ])
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
      {/* DocsLayout owns its own internal (sidebar + content) layout — a
          sibling placed after {children} inside it does NOT reliably land
          at the bottom of the page (confirmed live 2026-08-09: the Footer
          rendered at the TOP, inside the header/sidebar region, not below
          the doc content). Wrapping the whole thing in the same
          `flex min-h-screen flex-col` shell app/[locale]/(public)/layout.tsx
          uses — DocsLayout in a flex-1 slot, Footer as the next sibling —
          guarantees normal document flow instead of depending on
          DocsLayout's own internal CSS. */}
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">
          <DocsLayout
            tree={source.pageTree}
            nav={{ title: navTitle, url: `/${locale}/documentation` }}
            links={[{ type: "main", url: `/${locale}`, text: "Retour au site", icon: <ArrowLeft className="h-4 w-4" /> }]}
            searchToggle={{ enabled: false }}
            themeSwitch={{ enabled: false }}
            sidebar={{ footer: <ThemeToggle /> }}
          >
            {children}
          </DocsLayout>
        </div>
        <SiteFooter footerConfig={footerConfig} />
      </div>
    </RootProvider>
  )
}
