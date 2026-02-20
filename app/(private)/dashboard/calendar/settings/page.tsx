"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  ArrowLeft,
  Calendar,
  Check,
  Link2,
  Unlink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"

interface CalendarConnection {
  id: string
  provider: 'google' | 'microsoft'
  email?: string
  isActive: boolean
  lastSyncAt?: string
  createdAt: string
}

const providerInfo = {
  google: {
    name: "Google Calendar",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    description: "Sync your appointments with Google Calendar",
    type: "oauth" as const,
  },
  microsoft: {
    name: "Microsoft Outlook",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24">
        <path fill="#0078D4" d="M24 12L18 6v4H8v4h10v4l6-6z" />
        <path fill="#0078D4" d="M0 3h11v18H0V3z" />
        <path fill="#fff" d="M5.5 8.5a3 3 0 100 6 3 3 0 000-6z" />
      </svg>
    ),
    description: "Sync your appointments with Microsoft Outlook",
    type: "oauth" as const,
  },
  calendly: {
    name: "Calendly",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#006BFF" />
        <path fill="#fff" d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    description: "Connect your Calendly account",
    type: "apikey" as const,
  },
}

export default function CalendarSettingsPage() {
  const searchParams = useSearchParams()
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)

  const fetchConnections = async () => {
    try {
      const response = await fetch("/api/calendar")
      const data = await response.json()

      if (data.success) {
        setConnections(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()

    // Check for success/error in URL params
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (success === "google") {
      toast.success("Google Calendar connected successfully")
    } else if (success === "microsoft") {
      toast.success("Microsoft Outlook connected successfully")
    } else if (success === "calendly") {
      toast.success("Calendly connected successfully")
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: "Missing parameters",
        invalid_state: "Session expired, please try again",
        state_expired: "Session expired, please try again",
        storage_failed: "Storage error",
        callback_failed: "Connection error",
        access_denied: "Access denied",
      }
      toast.error(errorMessages[error] || `Error: ${error}`)
    }
  }, [searchParams])

  const handleConnect = async (provider: "google" | "microsoft") => {
    setConnectingProvider(provider)
    try {
      const response = await fetch(`/api/calendar/connect?provider=${provider}`)
      const data = await response.json()

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast.error(data.error || "Erreur lors de la connexion")
        setConnectingProvider(null)
      }
    } catch (error) {
      console.error("Failed to initiate connection:", error)
      toast.error("Erreur de connexion")
      setConnectingProvider(null)
    }
  }

  const handleDisconnect = async (id: string, provider: string) => {
    try {
      const response = await fetch(`/api/calendar?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success(`${providerInfo[provider as keyof typeof providerInfo].name} disconnected`)
        fetchConnections()
      } else {
        toast.error("Failed to disconnect")
      }
    } catch (error) {
      toast.error("Connection error")
    }
  }

  const getConnectionByProvider = (provider: "google" | "microsoft" | "calendly") => {
    return connections.find(c => c.provider === provider)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/calendar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Calendar Settings</h1>
          <p className="text-muted-foreground">
            Connect your external calendars to sync your appointments
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertTitle>Automatic Synchronization</AlertTitle>
        <AlertDescription>
          Once connected, your appointments will be automatically synchronized with your external calendars.
          Events created here will appear in Google Calendar, Microsoft Outlook, or Calendly.
        </AlertDescription>
      </Alert>

      {/* Calendar Connections */}
      <div className="space-y-4">
        {(["google", "microsoft", "calendly"] as const).map((provider) => {
          const info = providerInfo[provider]
          const connection = getConnectionByProvider(provider)
          const isConnecting = connectingProvider === provider

          return (
            <Card key={provider}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    {info.icon}
                  </div>
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {info.name}
                      {connection?.isActive && (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {connection?.email || info.description}
                    </p>
                    {connection?.lastSyncAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last sync: {format(new Date(connection.lastSyncAt), "MMM d, yyyy 'at' HH:mm", { locale: enUS })}
                      </p>
                    )}
                  </div>
                </div>

                {connection ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Unlink className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect {info.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Appointments will no longer be synchronized with this calendar.
                          Existing events will not be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDisconnect(connection.id, provider)}>
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    onClick={() => handleConnect(provider)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Connect
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Required Configuration
          </CardTitle>
          <CardDescription>
            To enable calendar synchronization, the following environment variables must be configured:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Google Calendar</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li><code className="bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code></li>
                <li><code className="bg-muted px-1 rounded">GOOGLE_CLIENT_SECRET</code></li>
                <li><code className="bg-muted px-1 rounded">GOOGLE_REDIRECT_URI</code> (optional)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Microsoft Outlook</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li><code className="bg-muted px-1 rounded">MICROSOFT_CLIENT_ID</code></li>
                <li><code className="bg-muted px-1 rounded">MICROSOFT_CLIENT_SECRET</code></li>
                <li><code className="bg-muted px-1 rounded">MICROSOFT_REDIRECT_URI</code> (optional)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Calendly</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li><code className="bg-muted px-1 rounded">CALENDLY_API_KEY</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            The application requests the following permissions:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Read and write calendar events
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Access to your email address (for identification)
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Automatic synchronization of new appointments
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            Your data is secure and access tokens are encrypted.
            You can revoke access at any time.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
