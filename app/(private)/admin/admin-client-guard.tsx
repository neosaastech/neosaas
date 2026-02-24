"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Shield } from "lucide-react"

/**
 * Client-side Admin Guard Component
 * Mounted in admin layout to provide client-side protection
 */
export function AdminClientGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        console.log("[CLIENT GUARD] Checking admin access for path:", pathname)

        const response = await fetch("/api/auth/me")

        if (!response.ok) {
          console.log("[CLIENT GUARD] Not authenticated, redirecting to login")
          router.push("/auth/login")
          return
        }

        const data = await response.json()
        const userRoles = data.user?.roles?.map((r: any) => r.roleName) || []

        console.log("[CLIENT GUARD] User roles:", userRoles)

        const hasAdminRole = userRoles.includes("admin") || userRoles.includes("super_admin")

        console.log("[CLIENT GUARD] Has admin role:", hasAdminRole)

        if (!hasAdminRole) {
          console.log("[CLIENT GUARD] No admin role, redirecting to dashboard")
          router.push("/dashboard")
          return
        }

        console.log("[CLIENT GUARD] Admin access granted")
        setIsAdmin(true)
      } catch (error) {
        console.error("[CLIENT GUARD] Error checking access:", error)
        router.push("/dashboard")
      } finally {
        setIsChecking(false)
      }
    }

    checkAdminAccess()
  }, [pathname, router])

  // Show loading state while checking admin access
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-pulse text-brand mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Vérification des droits d'accès administrateur...</p>
          <p className="text-sm text-muted-foreground/60 mt-2">Un moment...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not admin (will be redirected)
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Accès refusé</p>
          <p className="text-sm text-muted-foreground/60 mt-2">Redirection en cours...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
