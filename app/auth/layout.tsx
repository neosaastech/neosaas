import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { MinimalFooter } from "@/components/layout/minimal-footer"
import { isAuthenticated } from "@/lib/auth/server"
import { getPlatformConfig } from "@/lib/config"
import { PlatformConfigProvider } from "@/contexts/platform-config-context"

// Force dynamic rendering for auth checks
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPlatformConfig()
  return {
    title: `Authentication - ${config.siteName}`,
    description: `Authentication pages for ${config.siteName}`,
  }
}

/**
 * Auth Layout - Server Component
 *
 * This layout replaces middleware auth redirect logic for Next.js 16.
 * It redirects authenticated users away from auth pages to dashboard.
 *
 * NOTE: Login page is ALWAYS accessible, even in maintenance mode,
 * so that admins can log in to manage the site.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const platformConfig = await getPlatformConfig()

  // Redirect authenticated users to dashboard
  const authenticated = await isAuthenticated()
  if (authenticated) {
    redirect("/dashboard")
  }

  return (
    <PlatformConfigProvider config={platformConfig}>
      <div className="min-h-screen flex flex-col">
        <div className="p-4">
          <Link href="/" className="flex items-center">
            <div className="font-bold text-2xl tracking-tight">
              <span className="text-foreground">{platformConfig.siteName.substring(0, 3)}</span>
              <span className="text-brand">{platformConfig.siteName.substring(3)}</span>
            </div>
          </Link>
        </div>
        <div className="flex-1">{children}</div>
        <MinimalFooter />
      </div>
    </PlatformConfigProvider>
  )
}
