"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AdminGuardUser {
  id?: string
  userId?: string
  email?: string
  roles?: Array<{ roleName?: string }>
}

/**
 * Client-side admin access guard
 * Use this in all admin pages as a second layer of protection
 */
export function useRequireAdmin() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<AdminGuardUser | null>(null)

  useEffect(() => {
    let mounted = true

    async function checkAdminAccess() {
      try {
        console.log("[CLIENT GUARD] Checking admin access...")

        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        })

        if (response.status === 401) {
          console.log("[CLIENT GUARD] Not authenticated, redirecting to login")
          router.replace("/auth/login")
          return
        }

        if (response.status === 403) {
          console.log("[CLIENT GUARD] Authenticated but not admin, redirecting to dashboard")
          router.replace("/dashboard")
          return
        }

        if (!response.ok) {
          // Server-side /admin layout already enforces requireAdmin().
          // Avoid forcing a client-side logout on transient API failures.
          console.warn("[CLIENT GUARD] /api/auth/me returned", response.status, "- trusting server-side guard")
          if (mounted) {
            setIsAdmin(true)
          }
          return
        }

        const data = await response.json()
        const userRoles = data.user?.roles?.map((r: any) => r.roleName) || []

        console.log("[CLIENT GUARD] User roles:", userRoles)

        const hasAdminRole = userRoles.includes("admin") || userRoles.includes("super_admin")

        console.log("[CLIENT GUARD] Has admin role:", hasAdminRole)

        if (!hasAdminRole) {
          console.log("[CLIENT GUARD] No admin role, redirecting to dashboard")
          router.replace("/dashboard")
          return
        }

        console.log("[CLIENT GUARD] Admin access granted")
        if (mounted) {
          setUser(data.user ?? null)
          setIsAdmin(true)
        }
      } catch (error) {
        // Keep session in place on network/runtime hiccups; server layout remains the source of truth.
        console.error("[CLIENT GUARD] Error checking access, using server-side guard fallback:", error)
        if (mounted) {
          setIsAdmin(true)
        }
      } finally {
        if (mounted) {
          setIsChecking(false)
        }
      }
    }

    checkAdminAccess()

    return () => {
      mounted = false
    }
  }, [router])

  return { isChecking, isAdmin, user }
}
