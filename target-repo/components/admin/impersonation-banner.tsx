"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { LogOut, Shield } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function ImpersonationBanner() {
  const router = useRouter()
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [impersonatedUser, setImpersonatedUser] = useState("")

  useEffect(() => {
    // Vérifier si on est en mode impersonnation
    const checkImpersonation = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          if (data.impersonatedBy) {
            setIsImpersonating(true)
            setImpersonatedUser(data.user.email)
          }
        }
      } catch (error) {
        console.error("Error checking impersonation:", error)
      }
    }

    checkImpersonation()
  }, [])

  const handleStopImpersonation = async () => {
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Retour au compte administrateur")
        window.location.href = "/admin"
      } else {
        toast.error("Erreur lors de la déconnexion")
      }
    } catch (error) {
      console.error("Error stopping impersonation:", error)
      toast.error("Erreur lors de la déconnexion")
    }
  }

  if (!isImpersonating) return null

  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20 mb-4">
      <Shield className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-orange-800 dark:text-orange-200 font-medium">
          🔒 Mode administrateur : Vous visualisez le compte de <strong>{impersonatedUser}</strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStopImpersonation}
          className="border-orange-600 text-orange-600 hover:bg-orange-100"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Retour admin
        </Button>
      </AlertDescription>
    </Alert>
  )
}
