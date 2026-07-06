"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield } from "lucide-react"
import { useUser } from "@/lib/contexts/user-context"

/**
 * Client-side Admin Guard Component
 * Mounted in admin layout to provide client-side protection
 */
export function AdminClientGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAdmin, isLoading } = useUser()

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push("/dashboard")
    }
  }, [isAdmin, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-pulse text-brand mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Verifying administrator access...</p>
          <p className="text-sm text-muted-foreground/60 mt-2">One moment...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Access denied</p>
          <p className="text-sm text-muted-foreground/60 mt-2">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
