"use client"

import { Shield } from "lucide-react"
import { useRequireAdmin } from "@/lib/hooks/use-require-admin"
import { InternalRoutesSettings } from "@/components/admin/internal-routes-settings"

// Split out of /admin/pages (2026-07-04, Charles): /admin/pages should be
// the content environment (Pages/Articles), Internal Routes ACL is a
// separate, more sensitive concern — super_admin only (enforced for real
// by proxy.ts + page_permissions, this client guard is the secondary
// layer, same pattern as /admin/users).
export default function AdminInternalRoutesPage() {
  const { isChecking, isAdmin } = useRequireAdmin()

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-pulse text-brand mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Verifying access rights...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Internal Routes</h1>
        <p className="text-muted-foreground mt-1">
          Access levels for this app&apos;s own routes. Super admin only.
        </p>
      </div>
      <InternalRoutesSettings />
    </div>
  )
}
