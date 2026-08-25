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
import { RefreshCw, ShieldCheck, ShieldAlert, Loader2, GitCommitHorizontal, GitPullRequest } from "lucide-react"
import { toast } from "sonner"

interface UpdateJob {
  status: "pending" | "succeeded" | "pr_opened" | "up_to_date" | "failed" | "denied"
  version: string | null
  prUrl?: string | null
  finishedAt: string | null
  error?: string
}

interface UpdateStatus {
  currentVersion: string
  latestVersion: string | null
  upToDate: boolean | null
  checkedAt: string | null
  error?: string
  job?: UpdateJob | null
}

// A real Dokploy build (clone + docker build + swarm rollout) takes 3-5
// minutes end to end — confirmed live 2026-08-09 (payload-cms/neosaas-app
// incident day). The deploy endpoint only ever confirms the GitHub
// workflow_dispatch itself succeeded (a few hundred ms), not that the
// actual build finished — there is no reliable way to poll real completion
// from here (Dokploy's own deployment.all endpoint has already proven
// unreliable to match against elsewhere in this pipeline, see
// apply-update.yml). Charles, 2026-08-09: kept re-clicking "Apply update"
// because the toast gave no sense of "still working" vs "done", triggering
// several redundant concurrent builds. This cooldown is a deliberate
// UX guess, not a real completion signal — it exists only to stop the
// double-click, re-checks status once it elapses so the badge/button
// reflect reality as soon as possible after.
const DEPLOY_COOLDOWN_MS = 5 * 60 * 1000

export function UpdateSettings() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

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

  // Ticks the cooldown countdown and re-checks status the moment it elapses
  // (best-effort — the real build may still be running past the cooldown on
  // an unusually slow/cold-cache build, "Apply update" just becomes
  // clickable again rather than claiming certainty either way).
  useEffect(() => {
    if (!cooldownUntil) return
    const tick = () => {
      const remaining = cooldownUntil - Date.now()
      if (remaining <= 0) {
        setCooldownUntil(null)
        setCooldownRemaining(0)
        fetchStatus()
      } else {
        setCooldownRemaining(remaining)
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [cooldownUntil, fetchStatus])

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
      toast.success("Sync triggered — it opens a review PR, it does not deploy by itself. You'll get a notification with the PR link once it's ready. Avoid clicking again in the meantime.", { duration: 8000 })
      setCooldownUntil(Date.now() + DEPLOY_COOLDOWN_MS)
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

        {status?.job?.status === "pr_opened" && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-600/30 bg-amber-600/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <GitPullRequest className="h-4 w-4 shrink-0 animate-pulse" />
            <span>
              Automated sync finished but nothing is deployed yet — a review PR is open
              {status.job.version ? ` for ${status.job.version}` : ""}, merge it to actually ship it.
              {status.job.prUrl && (
                <>
                  {" "}
                  <a href={status.job.prUrl} target="_blank" rel="noreferrer" className="underline">
                    Open the PR
                  </a>
                </>
              )}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" onClick={handleCheck} disabled={checking} className="gap-2">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Check for updates
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={deploying || Boolean(cooldownUntil) || status?.upToDate !== false}
                className="gap-2 bg-brand hover:bg-brand/90"
              >
                {(deploying || cooldownUntil) && <Loader2 className="h-4 w-4 animate-spin" />}
                {cooldownUntil ? `Deploying… ${Math.ceil(cooldownRemaining / 1000)}s` : "Apply update"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply update {status?.latestVersion}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This syncs the latest Core release and opens a pull request for review — it does NOT deploy
                  by itself. Nothing goes live until you (or another admin) review the diff and merge that PR.
                  Takes a couple of minutes for the sync to finish; this dialog closing does not mean the PR
                  exists yet.
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
