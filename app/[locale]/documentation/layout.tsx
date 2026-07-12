import Image from "next/image"
import Link from "next/link"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"
import { ArrowLeft } from "lucide-react"
import { getDocsSource } from "@/lib/docs/fumadocs-source"
import { getPlatformConfig } from "@/lib/config"
import { shouldShowLogoInHeader, shouldShowSiteNameInHeader } from "@/lib/logo-display"

/**
 * Deliberately NOT nested under app/[locale]/(public) — that layout already
 * injects SiteHeader/SiteFooter/CookieConsent, which would double up with
 * DocsLayout's own nav/sidebar chrome. app/[locale]/layout.tsx (the only
 * layout above this one) is a thin passthrough, so this route gets Fumadocs'
 * shell and nothing else. Theme/search are disabled on RootProvider: the
 * site already has its own next-themes provider at the root, and no search
 * index exists yet (Charles, 2026-07-11: explicit "mode wiki exclusif" —
 * a minimal dedicated bar, not the full marketing header, but with a real
 * way back to the site — the previous version had neither, an isolated
 * section with no header/footer and no discoverable entry point).
 *
 * Charles (2026-07-12): the minimal nav still read as visually disconnected
 * from the rest of the site ("il faut une identité visuelle cohérente") —
 * reuses the same logo/site-name source as SiteHeader (lib/config.ts's
 * getPlatformConfig, same platform_config table) instead of a hardcoded
 * string, plus a small adapted footer (not the full marketing SiteFooter,
 * which has commerce/legal links irrelevant here — just logo, copyright,
 * and a link back to the main site).
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
  const logoSrc = logo || "/images/logo_neolux.jpg"

  const navTitle = (
    <span className="flex items-center gap-2">
      {shouldShowLogoInHeader(logoDisplayMode) && (
        <Image src={logoSrc} alt={siteName} width={24} height={24} className="rounded" />
      )}
      {shouldShowSiteNameInHeader(logoDisplayMode) && <span>{siteName} Documentation</span>}
    </span>
  )

  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsLayout
        tree={source.pageTree}
        nav={{ title: navTitle, url: `/${locale}/documentation` }}
        links={[{ type: "main", url: `/${locale}`, text: "Retour au site", icon: <ArrowLeft className="h-4 w-4" /> }]}
        searchToggle={{ enabled: false }}
      >
        {children}
        <footer className="mt-auto border-t px-4 py-6 md:px-6">
          <div className="flex flex-col items-center gap-3 text-sm text-fd-muted-foreground sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              {shouldShowLogoInHeader(logoDisplayMode) && (
                <Image src={logoSrc} alt={siteName} width={20} height={20} className="rounded" />
              )}
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
