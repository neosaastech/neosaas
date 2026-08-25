"use client"

import { useEffect, useState } from "react"
import { RefreshCw, CheckCircle2, GitPullRequest, XCircle, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import Link from "next/link"

type JobStatus = "pending" | "succeeded" | "pr_opened" | "up_to_date" | "failed" | "denied"

interface UpdateJob {
  status: JobStatus
  version: string | null
  prUrl?: string | null
  startedAt: string
  finishedAt: string | null
  error?: string
}

// Terminal outcomes stop being worth a header icon after a while -- without
// this, a "succeeded" badge from three days ago would sit there forever
// looking like something just happened. Failures/denials get longer
// visibility since those genuinely need someone to notice and act.
const SUCCEEDED_VISIBLE_MS = 10 * 60 * 1000
const FAILED_VISIBLE_MS = 24 * 60 * 60 * 1000

/**
 * Super-admin-only header icon reflecting the state of this instance's own
 * self-update (see components/admin/update-settings.tsx / "Apply update").
 * Polls the same endpoint that button already uses -- deliberately global
 * (lives in the shared header, not the Updates tab) so the status survives
 * navigating away mid-deploy instead of only being visible on one page.
 * The actual "did it succeed" record of truth is the notification posted to
 * the admin support/chat center (see /api/admin/system/update/callback) --
 * this icon is a live-glance companion to that, not a replacement for it.
 */
export function UpdateStatusIcon({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [job, setJob] = useState<UpdateJob | null>(null)

  useEffect(() => {
    if (!isSuperAdmin) return

    let mounted = true
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/system/update", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setJob(data.job ?? null)
      } catch {
        // best-effort — a failed poll just means the icon doesn't update this tick
      }
    }

    poll()
    const interval = setInterval(poll, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isSuperAdmin])

  if (!isSuperAdmin || !job) return null

  const finishedAgo = job.finishedAt ? Date.now() - new Date(job.finishedAt).getTime() : 0
  if ((job.status === "succeeded" || job.status === "up_to_date") && finishedAgo > SUCCEEDED_VISIBLE_MS) return null
  if ((job.status === "failed" || job.status === "denied" || job.status === "pr_opened") && finishedAgo > FAILED_VISIBLE_MS) return null

  // pr_opened deliberately does NOT reuse the green checkmark: this repo's
  // apply-update is PR-gated (see .github/workflows/apply-update.yml), so
  // "the workflow finished" only ever means "a review PR is open", never
  // "deployed" -- v1.29.0 test (Charles, 2026-08-25) showed a green check +
  // "now running" message while PR #17 sat unmerged and nothing changed.
  const config: Record<JobStatus, { icon: React.ReactNode; label: string; className: string }> = {
    pending: {
      icon: <RefreshCw className="h-5 w-5 animate-spin" />,
      label: `Update in progress${job.version ? ` — ${job.version}` : ""}`,
      className: "text-brand",
    },
    succeeded: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      label: `Already up to date${job.version ? ` — ${job.version}` : ""}`,
      className: "text-green-600",
    },
    up_to_date: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      label: `Already up to date${job.version ? ` — ${job.version}` : ""}`,
      className: "text-green-600",
    },
    pr_opened: {
      // animate-pulse, not animate-spin: this isn't "in progress" like
      // `pending` above, it's "stalled, waiting on you" — a spin would
      // imply the automation is still doing something, which is exactly
      // the false impression this fix exists to remove (Charles,
      // 2026-08-25: "le détail qui tuerait" — wants the PR icon to visibly
      // demand attention, not just sit there in a different color).
      icon: <GitPullRequest className="h-5 w-5 animate-pulse" />,
      label: `Review PR open — not deployed yet${job.version ? ` (${job.version})` : ""}`,
      className: "text-amber-600",
    },
    failed: {
      icon: <XCircle className="h-5 w-5" />,
      label: `Update failed${job.error ? ` — ${job.error}` : ""}`,
      className: "text-destructive",
    },
    denied: {
      icon: <ShieldAlert className="h-5 w-5" />,
      label: `Update denied${job.error ? ` — ${job.error}` : ""}`,
      className: "text-destructive",
    },
  }

  const { icon, label, className } = config[job.status]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={className} asChild>
            <Link href="/admin/settings">{icon}</Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
