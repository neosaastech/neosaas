/**
 * System Update — check the Core repo's latest tag and (optionally) trigger
 * a Kube rollout via a secured webhook. Admin/super-admin only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminAuth } from '@/lib/auth/admin-auth'
import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logSystemEvent } from '@/app/actions/logs'
import { initGithub } from '@/lib/services/initializers'
import { sendAdminNotification } from '@/lib/notifications/admin-notifications'
import packageJson from '../../../../../package.json'

const CONFIG_KEY = 'system_update_status'
// Tracks the one in-flight/most-recent deploy job in platformConfig (same
// key-value pattern as CONFIG_KEY above -- additive, no migration needed).
// Exists because deployUpdate() below only ever confirms the GitHub
// workflow_dispatch call itself succeeded; the real build/deploy outcome
// only becomes known minutes later, when apply-update.yml calls back into
// /api/admin/system/update/callback. Polled by the header's super-admin-only
// status icon so "is an update running / did it just fail" survives page
// navigation instead of living in that one component's local state.
const JOB_CONFIG_KEY = 'system_update_job'

type UpdateJobStatus = 'pending' | 'succeeded' | 'failed' | 'denied'

interface UpdateJob {
  status: UpdateJobStatus
  version: string | null
  startedAt: string
  finishedAt: string | null
  error?: string
  triggeredBy?: string
}

async function readJob(): Promise<UpdateJob | null> {
  const [row] = await db
    .select()
    .from(platformConfig)
    .where(eq(platformConfig.key, JOB_CONFIG_KEY))
    .limit(1)
  if (!row?.value) return null
  try {
    return JSON.parse(row.value) as UpdateJob
  } catch {
    return null
  }
}

async function writeJob(job: UpdateJob): Promise<void> {
  const value = JSON.stringify(job)
  await db
    .insert(platformConfig)
    .values({ key: JOB_CONFIG_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformConfig.key,
      set: { value, updatedAt: new Date() },
    })
}

interface UpdateStatus {
  currentVersion: string
  latestVersion: string | null
  upToDate: boolean | null
  checkedAt: string | null
  error?: string
}

// GitHub's tags API is used (not /releases/latest) because this repo is
// tag-only, no formal GitHub Releases — matches "comparer le dernier tag".
// Every field here is treated as possibly missing/null: an unauthenticated
// or malformed response must degrade to "couldn't check", never crash the
// route (the exact class of bug the i18n null/undefined mismatch was).
const GitHubTagSchema = z.object({
  name: z.string(),
  commit: z
    .object({
      sha: z.string().nullish(),
      url: z.string().nullish(),
    })
    .nullish(),
})
const GitHubTagsResponseSchema = z.array(GitHubTagSchema)

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

    const res = await fetch(`https://api.github.com/repos/${repo}/tags?per_page=1`, { headers })
    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`)
    }

    const raw = await res.json()
    const tags = GitHubTagsResponseSchema.parse(raw)
    const latestVersion = tags[0]?.name ?? null

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

  // Confirmed live 2026-08-13: hardcoded to 'main' regardless of which
  // environment's admin actually clicked the button — the dev instance's
  // "Appliquer le correctif" silently dispatched apply-update.yml against
  // main every time, meaning dev's own admin could never trigger a real
  // update of itself (and had no way to know that's what happened — this
  // call always returned 204/ok). DEPLOY_BRANCH already exists in this
  // env per Dokploy application config (main for prod, the feature branch
  // for dev — see apply-update.yml's own "Determine Dokploy target" step
  // using the same variable server-side) but was never read here.
  const ref = process.env.DEPLOY_BRANCH || 'main'

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref }),
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
  const job = await readJob()
  return NextResponse.json({ ...status, job })
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
  const currentStatus = await readStatus()
  const result = await deployUpdate(authResult.userId)
  const now = new Date().toISOString()

  if (result.ok) {
    await writeJob({
      status: 'pending',
      version: currentStatus.latestVersion,
      startedAt: now,
      finishedAt: null,
      triggeredBy: authResult.userId,
    })
    await sendAdminNotification({
      subject: `Update triggered${currentStatus.latestVersion ? ` — ${currentStatus.latestVersion}` : ''}`,
      message: `🚀 **System update started**\n\nDeploying${currentStatus.latestVersion ? ` version ${currentStatus.latestVersion}` : ''}. This takes 3-5 minutes to actually build and go live — you'll get a follow-up message here once it succeeds or fails.`,
      type: 'system',
      mode: 'informative',
      userId: authResult.userId,
      priority: 'normal',
      category: 'action',
      superAdminOnly: true,
      metadata: { notificationType: 'system_update_started', actionRequired: false, version: currentStatus.latestVersion },
    })
  } else {
    // "Denied" case: the dispatch itself never even started (missing
    // GitHub config, GitHub API error, etc.) -- distinct from a build that
    // starts and later fails, which the callback endpoint reports instead.
    await writeJob({
      status: 'denied',
      version: currentStatus.latestVersion,
      startedAt: now,
      finishedAt: now,
      error: typeof result.body?.error === 'string' ? result.body.error : 'Update could not be started',
      triggeredBy: authResult.userId,
    })
    await sendAdminNotification({
      subject: 'Update denied',
      message: `❌ **System update denied**\n\n${typeof result.body?.error === 'string' ? result.body.error : 'Update could not be started.'}`,
      type: 'system',
      mode: 'interactive',
      userId: authResult.userId,
      priority: 'high',
      category: 'urgent',
      superAdminOnly: true,
      metadata: { notificationType: 'system_update_denied', actionRequired: true },
    })
  }

  return NextResponse.json(result.body, { status: result.status })
}
