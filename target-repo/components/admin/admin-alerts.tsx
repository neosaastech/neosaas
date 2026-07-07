"use client"

import { getAdminAlerts, type AdminAlert } from "@/app/actions/admin-alerts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function AdminAlerts() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([])

  const fetchAlerts = async () => {
    try {
      const data = await getAdminAlerts()
      setAlerts(data)
    } catch (error) {
      console.error("Failed to fetch admin alerts", error)
    }
  }

  useEffect(() => {
    fetchAlerts()

    const handleRefresh = () => fetchAlerts()
    window.addEventListener('refreshAdminAlerts', handleRefresh)

    return () => {
      window.removeEventListener('refreshAdminAlerts', handleRefresh)
    }
  }, [])

  if (alerts.length === 0) return null

  return (
    <div className="space-y-4 mb-6">
      {alerts.map((alert) => (
        <Alert 
          key={alert.id} 
          variant={alert.type === 'error' ? 'destructive' : 'default'}
          className={alert.type === 'warning' ? 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400' : ''}
        >
          {alert.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {alert.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
          {alert.type === 'info' && <Info className="h-4 w-4" />}
          
          <AlertTitle className="flex items-center gap-2">
            {alert.title}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-2">
            <span>{alert.message}</span>
            {alert.actionLabel && alert.actionUrl && (
              <Button variant="outline" size="sm" className="ml-4 h-8" asChild>
                <Link href={alert.actionUrl}>
                  {alert.actionLabel}
                </Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
