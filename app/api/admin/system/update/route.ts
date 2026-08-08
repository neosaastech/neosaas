/**
 * System Update — check the Core repo's latest release and (optionally)
 * trigger a sync + redeploy of this site. Admin/super-admin only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminAuth } from '@/lib/auth/admin-auth'
import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logSystemEvent } from '@/app/actions/logs'
import { sendAdminNotification } from '@/lib/notifications/admin-notifications'
import { initGithub } from '@/lib/services/initializers'
import packageJson from '../../../../../package.json'

const CONFIG_KEY = 'system_update_status'

interface UpdateStatus {
  currentVersion: string
  latestVersion: string | null
  upToDate: boolean | null
  checkedAt: string | null
  error?: string
}

// GET /tags is NOT sorted by recency (confirmed live: it once returned a
// stale tag ahead of a just-published release, causing apply-update.yml to
// silently apply an older version — fixed there 2026-07-07 by switching to
// /releases/latest, which has real "latest published release" semantics).
// This route had the same bug independently — mirroring the same fix here.
// Every field here is treated as possibly missing/null: an unauthenticated
// or malformed response must degrade to "couldn't check", never crash the
// route (the exact class of bug the i18n null/undefined mismatch was).
const GitHubReleaseResponseSchema = z.object({
  tag_name: z.string(),
})

// Reads package.json directly instead of a NEXT_PUBLIC_APP_VERSION env var —
// that var has to be set by hand per site and nothing in the apply-update
// sync touches it, so it silently goes stale (confirmed live: stuck on
// "1.1.2" for months while package.json/the actual deployed code moved
// through several real releases up to v1.8.0). package.json's version is
// the one field the sync genuinely keeps current on every run.
function getCurrentVersion(): string {
  return packageJson.version || '0.0.0'
}

/**
 * Git tags conventionally carry a leading "v" (e.g. "v1.0.1") while
 * package.json usually doesn't ("1.0.1") — confirmed against the real repo
 * (`v1.0.1` tag vs `1.0.1` in package.json). Comparing the raw strings would
 * report "update available" when actually up to date.
 */
function normalizeVersion(version: string): string {
  return version.replace(/^v/i, '')
}

async function readStatus(): Promise<UpdateStatus> {
  const currentVersion = getCurrentVersion()
  try {
    const [row] = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.key, CONFIG_KEY))
      .limit(1)

    if (!row?.value) {
      return { currentVersion, latestVersion: null, upToDate: null, checkedAt: null }
    }

    const parsed = JSON.parse(row.value) as Partial<UpdateStatus>
    return {
      currentVersion,
      latestVersion: parsed.latestVersion ?? null,
      upToDate: parsed.upToDate ?? null,
      checkedAt: parsed.checkedAt ?? null,
    }
  } catch (error) {
    console.error('[system/update] Failed to read status:', error)
    return { currentVersion, latestVersion: null, upToDate: null, checkedAt: null }
  }
}

async function writeStatus(status: UpdateStatus): Promise<void> {
  const value = JSON.stringify(status)
  await db
    .insert(platformConfig)
    .values({ key: CONFIG_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformConfig.key,
      set: { value, updatedAt: new Date() },
    })
}

async function checkForUpdate(userId?: string): Promise<UpdateStatus> {
  const currentVersion = getCurrentVersion()
  const repo = process.env.CORE_GITHUB_REPO // e.g. "neosaastech/Neosaas-app"
  // Read before overwriting so we can tell "still the same update we already
  // notified about" from "a genuinely new release just appeared" below.
  const previousStatus = await readStatus()

  if (!repo) {
    return {
      currentVersion,
      latestVersion: null,
      upToDate: null,
      checkedAt: new Date().toISOString(),
      error: 'CORE_GITHUB_REPO not configured',
    }
  }

  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers })
    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`)
    }

    const raw = await res.json()
    const latestVersion = GitHubReleaseResponseSchema.parse(raw).tag_name

    const status: UpdateStatus = {
      currentVersion,
      latestVersion,
      upToDate: latestVersion ? normalizeVersion(latestVersion) === normalizeVersion(currentVersion) : null,
      checkedAt: new Date().toISOString(),
    }

    await writeStatus(status)
    await logSystemEvent({
      category: 'system_update',
      level: 'info',
      message: `Update check: current=${currentVersion} latest=${latestVersion ?? 'unknown'}`,
      userId,
    })

    // System Logs is not visible anywhere in the admin UI's own notification
    // feed (bell icon) — an admin had no way to learn "a new version is out"
    // short of opening this tab and clicking Check for updates themselves.
    // Only fire once per newly-seen version, not on every check click.
    if (!status.upToDate && status.latestVersion && status.latestVersion !== previousStatus.latestVersion) {
      await sendAdminNotification({
        subject: `Nouvelle version Core disponible : ${status.latestVersion}`,
        message: `La version actuelle de ce site est ${status.currentVersion}. La dernière version publiée du Core est ${status.latestVersion}. Rendez-vous dans Paramètres → Mises à jour pour l'appliquer.`,
        type: 'system',
        mode: 'informative',
      })
    }

    return status
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[system/update] check failed:', error)
    await logSystemEvent({
      category: 'system_update',
      level: 'error',
      message: `Update check failed: ${message}`,
      userId,
    })
    return {
      currentVersion,
      latestVersion: null,
      upToDate: null,
      checkedAt: new Date().toISOString(),
      error: message,
    }
  }
}

/**
 * Triggers a GitHub Actions workflow_dispatch on THIS site's own repo
 * (.github/workflows/apply-update.yml) — the workflow clones the latest
 * tagged neosaastech/neosaas release, syncs it in, and pushes to main,
 * which Vercel's git integration then deploys automatically. This is the
 * path for our own Vercel-hosted sites (neosaas-website and future child
 * sites), where there is no Kubernetes pod to roll out.
 */
async function deployViaGithubActions(
  userId?: string,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  // Credentials come from this site's own encrypted "github_api" config
  // (admin/api → "🔑 API Configuration (Server Integration)"), not from Vercel
  // env vars — pasted once by an admin for this site specifically, no manual
  // CLI/Vault setup needed per site. The repo field is the same panel,
  // extended for this purpose (see lib/services/initializers.ts:initGithub).
  let githubToken: string
  let repo: string
  let workflowFile: string
  try {
    const gh = await initGithub()
    githubToken = gh.token
    repo = gh.repo
    workflowFile = gh.workflowFile
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await logSystemEvent({
      category: 'system_update',
      level: 'error',
      message: `GitHub configuration missing or invalid: ${message}`,
      userId,
    })
    return {
      ok: false,
      status: 501,
      body: { success: false, error: `Configuration GitHub manquante ou invalide : ${message}` },
    }
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      // DEPLOY_BRANCH lets a non-production instance of this repo (e.g. a
      // long-lived dev/staging branch deployed separately from main) target
      // its OWN branch instead of always syncing main — confirmed live:
      // without this, "Apply update" clicked from a dev instance's admin
      // silently updated production's main branch and left dev on its old
      // version with no visible error (the dispatch itself succeeds; it's
      // just operating on the wrong branch).
      body: JSON.stringify({ ref: process.env.DEPLOY_BRANCH || 'main' }),
    },
  )

  // GitHub returns 204 No Content on a successful dispatch.
  const ok = res.status === 204
  await logSystemEvent({
    category: 'system_update',
    level: ok ? 'info' : 'error',
    message: ok
      ? `apply-update workflow dispatched on ${repo}`
      : `GitHub workflow_dispatch returned ${res.status}`,
    userId,
  })

  return {
    ok,
    status: ok ? 200 : 502,
    body: ok
      ? { success: true }
      : { success: false, error: `GitHub API returned ${res.status}` },
  }
}

/**
 * Triggers the Kube-side rollout for self-hosted (Docker/K8s) customers —
 * separate from the Vercel path above. UPDATE_ORCHESTRATOR_WEBHOOK_URL must
 * point to a real, separately-secured endpoint in the customer's own
 * cluster with the narrow permission to roll out this one deployment.
 */
async function deployViaKubeWebhook(
  userId?: string,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const webhookUrl = process.env.UPDATE_ORCHESTRATOR_WEBHOOK_URL
  const token = process.env.UPDATE_SYSTEM_TOKEN

  try {
    const res = await fetch(webhookUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ triggeredAt: new Date().toISOString() }),
    })

    const ok = res.ok
    await logSystemEvent({
      category: 'system_update',
      level: ok ? 'info' : 'error',
      message: ok ? 'Deploy webhook triggered successfully' : `Deploy webhook returned ${res.status}`,
      userId,
    })

    return { ok, status: ok ? 200 : 502, body: { success: ok } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[system/update] deploy failed:', error)
    await logSystemEvent({
      category: 'system_update',
      level: 'error',
      message: `Deploy webhook call failed: ${message}`,
      userId,
    })
    return { ok: false, status: 502, body: { success: false, error: message } }
  }
}

/**
 * Picks whichever deploy path this deployment has been configured for.
 * Vercel-hosted sites paste a GitHub token + repo in admin/api's "API
 * Configuration (Server Integration)" panel (serviceName='github_api');
 * self-hosted customers set
 * UPDATE_ORCHESTRATOR_WEBHOOK_URL/UPDATE_SYSTEM_TOKEN. Neither configured →
 * 501, no silent no-op.
 */
async function deployUpdate(userId?: string): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const hasGithubConfig = await initGithub().then(() => true).catch(() => false)
  if (hasGithubConfig) {
    return deployViaGithubActions(userId)
  }

  if (process.env.UPDATE_ORCHESTRATOR_WEBHOOK_URL && process.env.UPDATE_SYSTEM_TOKEN) {
    return deployViaKubeWebhook(userId)
  }

  return {
    ok: false,
    status: 501,
    body: {
      success: false,
      error:
        'Aucun mécanisme de mise à jour configuré — ajoute un compte GitHub dans admin/api (Vercel-hosted), ou configure UPDATE_ORCHESTRATOR_WEBHOOK_URL/UPDATE_SYSTEM_TOKEN (self-hosted).',
    },
  }
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.isAuthenticated ? 403 : 401 },
    )
  }

  const status = await readStatus()
  return NextResponse.json(status)
}

const ActionBodySchema = z.object({
  action: z.enum(['check', 'deploy']),
})

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.isAuthenticated ? 403 : 401 },
    )
  }

  let action: 'check' | 'deploy'
  try {
    const body = await request.json()
    ;({ action } = ActionBodySchema.parse(body))
  } catch {
    return NextResponse.json({ error: 'Invalid request body — expected { action: "check" | "deploy" }' }, { status: 400 })
  }

  if (action === 'check') {
    const status = await checkForUpdate(authResult.userId)
    return NextResponse.json(status)
  }

  // action === 'deploy'
  const result = await deployUpdate(authResult.userId)
  return NextResponse.json(result.body, { status: result.status })
}
