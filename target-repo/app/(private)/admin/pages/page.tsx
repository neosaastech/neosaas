"use client"

import { Shield } from "lucide-react"
import { useRequireAdmin } from "@/lib/hooks/use-require-admin"
import { ContentHub } from "@/components/admin/pages-settings"

// Split out of /admin/settings (was the "Pages ACL" tab) — content
// management outgrew a settings tab and deserved its own place in the nav.
export default function AdminPagesPage() {
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
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Content</h1>
        <p className="text-muted-foreground mt-1">Create and manage Pages and Articles.</p>
      </div>
      <ContentHub />
    </div>
  )
}
