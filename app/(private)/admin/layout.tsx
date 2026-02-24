import type React from "react"
import { requireAdmin } from "@/lib/auth/server"
import { AdminClientGuard } from "./admin-client-guard"
import { AdminLiveChat } from "@/components/admin/admin-live-chat"

/**
 * Admin Layout - Dual Protection (Server + Client)
 *
 * IMPORTANT: This layout protects ALL routes under /admin with TWO layers:
 * 1. Server-side: requireAdmin() checks roles from database
 * 2. Client-side: AdminClientGuard checks roles via API
 *
 * Only users with 'admin' or 'super_admin' roles can access.
 *
 * NOTE: Do NOT wrap requireAdmin() in try/catch — redirect() throws a
 * special NEXT_REDIRECT error that must propagate to the framework.
 * Catching it would swallow redirects and cause Server Components errors.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // SERVER-SIDE: Verify admin access
  // requireAdmin() handles its own redirects:
  //   - No token → redirect("/auth/login")
  //   - Not admin → redirect("/dashboard")
  // Let these propagate naturally — do NOT wrap in try/catch.
  const user = await requireAdmin()

  console.log("[ADMIN LAYOUT] ✅ Admin access GRANTED for:", user.email)

  // CLIENT-SIDE: Additional protection layer
  return (
    <AdminClientGuard>
      {children}
      <AdminLiveChat />
    </AdminClientGuard>
  )
}

// Force dynamic rendering - disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0
