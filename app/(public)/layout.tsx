import type React from "react"
import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { getCurrentUser } from "@/lib/auth"
import { getPlatformConfig } from "@/lib/config"
import { PlatformConfigProvider } from "@/contexts/platform-config-context"
import { isAdmin } from "@/lib/auth/server"
import { CookieConsent } from "@/components/legal/cookie-consent"
import { ChatWidgetWrapper } from "@/components/chat/chat-widget-wrapper"

// Force dynamic rendering to ensure maintenance mode check runs on every request
export const dynamic = 'force-dynamic'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const platformConfig = await getPlatformConfig()

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
        <SiteHeader user={user} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CookieConsent
          logo={platformConfig.showCookieLogo ? platformConfig.logo : null}
          enabled={platformConfig.cookieConsentEnabled}
          message={platformConfig.cookieConsentMessage}
          siteName={platformConfig.siteName}
          position={platformConfig.cookiePosition}
        />
        <ChatWidgetWrapper />
      </div>
    </PlatformConfigProvider>
  )
}
