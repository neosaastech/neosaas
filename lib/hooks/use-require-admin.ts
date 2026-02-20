"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

/**
 * Client-side admin access guard
 * Use this in all admin pages as a second layer of protection
 */
export function useRequireAdmin() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        console.log("[CLIENT GUARD] Checking admin access...")

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
  }, [router])

  return { isChecking, isAdmin }
}
