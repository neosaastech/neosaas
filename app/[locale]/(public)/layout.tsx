import type React from "react"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { getCurrentUser } from "@/lib/auth"
import { getPlatformConfig } from "@/lib/config"
import { getHeaderConfig, getFooterConfig, getAlternatePagePaths } from "@/app/actions/site-nav"
import { PlatformConfigProvider } from "@/contexts/platform-config-context"
import { isAdmin } from "@/lib/auth/server"
import { CookieConsent } from "@/components/legal/cookie-consent"
import { ChatWidgetWrapper } from "@/components/chat/chat-widget-wrapper"
import { isOfflineDev } from "@/lib/dev/offline-mode"
import { OfflineBanner } from "@/components/dev/offline-banner"

// Force dynamic rendering to ensure maintenance mode check runs on every request
export const dynamic = 'force-dynamic'

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  // Stamped by proxy.ts (no other way for a shared layout to know the
  // current route) — strip the locale prefix to get the real page path
  // Header/Footer scoping resolves against (see app/actions/site-nav.ts).
  const rawPathname = (await headers()).get("x-pathname") ?? `/${locale}`
  const pagePath = rawPathname === `/${locale}` ? "/" : rawPathname.slice(`/${locale}`.length) || "/"

  const user = await getCurrentUser()
  const platformConfig = await getPlatformConfig()
  const [headerConfig, footerConfig, alternatePaths] = await Promise.all([
    getHeaderConfig(pagePath, locale),
    getFooterConfig(pagePath, locale),
    getAlternatePagePaths(pagePath, locale),
  ])

  // Check maintenance mode - redirect non-admin users to maintenance page
  if (platformConfig.maintenanceMode) {
    const userIsAdmin = user ? await isAdmin(user.userId) : false
    if (!userIsAdmin) {
      redirect("/maintenance")
    }
  }

  return (
    <PlatformConfigProvider config={platformConfig}>
      <div className="flex min-h-screen flex-col">
        {isOfflineDev() && <OfflineBanner />}
        <SiteHeader user={user} headerConfig={headerConfig} alternatePaths={alternatePaths} />
        <main className="flex-1">{children}</main>
        <SiteFooter footerConfig={footerConfig} />
        <CookieConsent
          logo={platformConfig.showCookieLogo ? platformConfig.logo : null}
          enabled={platformConfig.cookieConsentEnabled}
          message={platformConfig.cookieConsentMessage}
          messageEn={platformConfig.cookieConsentMessageEn}
          siteName={platformConfig.siteName}
          position={platformConfig.cookiePosition}
        />
        <ChatWidgetWrapper />
      </div>
    </PlatformConfigProvider>
  )
}
