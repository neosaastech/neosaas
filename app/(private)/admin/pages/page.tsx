"use client"

import { Shield } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useRequireAdmin } from "@/lib/hooks/use-require-admin"
import { ContentHub } from "@/components/admin/pages-settings"
import { HeaderFooterPanel } from "@/components/admin/content/header-footer-panel"
import { ModulesPanel } from "@/components/admin/content/modules-panel"
import { AuthorsPanel } from "@/components/admin/content/authors-panel"
import { MediaGallery } from "@/components/admin/content/media-gallery"
import { ThemeSettings } from "@/components/admin/theme-settings"

// Split out of /admin/settings (was the "Pages ACL" tab) — content
// management outgrew a settings tab and deserved its own place in the nav.
// `?type=header`/`?type=footer` (set by the sidebar's Content sub-links,
// see components/layout/private-dashboard/sidebar.tsx) swaps in a
// dedicated, lighter panel instead of ContentHub — Header/Footer are a
// handful of docs per tenant, not paginated/versioned content, so they
// don't fit ContentHub's Pages/Articles/Categories table.
export default function AdminPagesPage() {
  const { isChecking, isAdmin } = useRequireAdmin()
  const searchParams = useSearchParams()
  const type = searchParams.get("type")

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
        <h1 className="text-2xl sm:text-3xl font-bold">Content Management</h1>
      </div>
      {type === "header" || type === "footer" ? (
        <HeaderFooterPanel type={type} />
      ) : type === "modules" ? (
        <ModulesPanel />
      ) : type === "authors" ? (
        <AuthorsPanel />
      ) : type === "media" ? (
        <MediaGallery />
      ) : type === "style" ? (
        <ThemeSettings />
      ) : (
        <ContentHub />
      )}
    </div>
  )
}
