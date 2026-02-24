import type React from "react"
import { redirect } from "next/navigation"
import { requireAuth, isAdmin } from "@/lib/auth/server"
import { PrivateLayoutClient } from "./layout-client"
import { getPlatformConfig } from "@/lib/config"
import { AdminAlerts } from "@/components/admin/admin-alerts"

// Force dynamic rendering for maintenance mode check
export const dynamic = 'force-dynamic'

/**
 * Private Layout - Server Component
 *
 * This layout replaces middleware auth logic for Next.js 16.
 * It verifies authentication server-side before rendering protected routes.
 * It also checks maintenance mode and redirects non-admin users.
 */
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  // Verify authentication - redirects to login if not authenticated
  const user = await requireAuth()
  const platformConfig = await getPlatformConfig()
  const userIsAdmin = await isAdmin(user.userId)

  // Check maintenance mode - redirect non-admin users to maintenance page
  if (platformConfig.maintenanceMode) {
    if (!userIsAdmin) {
      redirect("/maintenance")
    }
  }

  const alerts = userIsAdmin ? <AdminAlerts /> : null

  return <PrivateLayoutClient user={user} platformConfig={platformConfig} alerts={alerts}>{children}</PrivateLayoutClient>
}
