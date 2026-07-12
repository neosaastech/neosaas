import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"
import { ArrowLeft } from "lucide-react"
import { getDocsSource } from "@/lib/docs/fumadocs-source"

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
 */
export default async function DocumentationLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}) {
  const { locale } = await params
  const source = await getDocsSource(locale)

  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsLayout
        tree={source.pageTree}
        nav={{ title: "NeoSaaS Documentation", url: `/${locale}/documentation` }}
        links={[{ type: "main", url: `/${locale}`, text: "Retour au site", icon: <ArrowLeft className="h-4 w-4" /> }]}
        searchToggle={{ enabled: false }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  )
}
