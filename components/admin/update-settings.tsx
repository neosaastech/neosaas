"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { RefreshCw, ShieldCheck, ShieldAlert, Loader2, GitCommitHorizontal } from "lucide-react"
import { toast } from "sonner"

interface UpdateStatus {
  currentVersion: string
  latestVersion: string | null
  upToDate: boolean | null
  checkedAt: string | null
  error?: string
}

export function UpdateSettings() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [deploying, setDeploying] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system/update")
      if (res.ok) {
        setStatus(await res.json())
      }
    } catch (error) {
      console.error("[UpdateSettings] fetchStatus failed:", error)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleCheck = async () => {
    setChecking(true)
    try {
      const res = await fetch("/api/admin/system/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      })
      const data: UpdateStatus = await res.json()
      setStatus(data)
      if (data.error) {
        toast.error(`Update check failed: ${data.error}`)
      } else if (data.upToDate) {
        toast.success("You're on the latest version")
      } else {
        toast.info(`New version available: ${data.latestVersion}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update check failed")
    } finally {
      setChecking(false)
    }
  }

  const handleDeploy = async () => {
    setDeploying(true)
    try {
      const res = await fetch("/api/admin/system/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deploy" }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Deploy failed (${res.status})`)
      }
      toast.success("Update triggered — the site will redeploy shortly")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to trigger update")
    } finally {
      setDeploying(false)
    }
  }

  const upToDate = status?.upToDate
  const badgeVariant = upToDate === true ? "default" : upToDate === false ? "destructive" : "outline-solid"
  const badgeLabel = upToDate === true ? "Up to date" : upToDate === false ? "Update available" : "Not checked yet"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCommitHorizontal className="h-5 w-5 text-brand" />
          System Updates
        </CardTitle>
        <CardDescription>Sync this instance with the Core image</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 rounded-lg border bg-muted p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Current version</p>
            <p className="font-mono text-sm font-medium">{status?.currentVersion ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last check</p>
            <p className="text-sm font-medium">
              {status?.checkedAt ? new Date(status.checkedAt).toLocaleString() : "Never"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Core sync status</p>
            <Badge variant={badgeVariant} className="mt-1 gap-1">
              {upToDate === true && <ShieldCheck className="h-3 w-3" />}
              {upToDate === false && <ShieldAlert className="h-3 w-3" />}
              {badgeLabel}
            </Badge>
          </div>
        </div>

        {status?.latestVersion && !status.upToDate && (
          <p className="text-sm text-muted-foreground">
            Latest Core tag: <span className="font-mono font-medium text-foreground">{status.latestVersion}</span>
          </p>
        )}
        {status?.error && <p className="text-sm text-destructive">{status.error}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" onClick={handleCheck} disabled={checking} className="gap-2">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Check for updates
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={deploying || status?.upToDate !== false}
                className="gap-2 bg-brand hover:bg-brand/90"
              >
                {deploying && <Loader2 className="h-4 w-4 animate-spin" />}
                Apply update
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply update {status?.latestVersion}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will sync the latest Core release into this site and redeploy it. The
                  application will be briefly unavailable during the redeploy. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeploy}>Confirm & Apply</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
