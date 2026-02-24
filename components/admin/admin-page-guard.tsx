"use client"

import type React from "react"
import { useRequireAdmin } from "@/lib/hooks/use-require-admin"
import { Shield } from "lucide-react"

/**
 * Admin Page Wrapper Component
 * Automatically checks admin access and shows loading state
 * Use this to wrap any admin page content
 */
export function AdminPageGuard({ children }: { children: React.ReactNode }) {
  const { isChecking, isAdmin } = useRequireAdmin()

  // Show loading state while checking admin access
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-pulse text-brand mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Vérification des droits d'accès...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not admin (will be redirected)
  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}
