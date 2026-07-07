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

const CONFIG_KEY = 'system_update_status'

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

function getCurrentVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'
}

/**
 * Git tags conventionally carry a leading "v" (e.g. "v1.0.1") while
 * package.json/NEXT_PUBLIC_APP_VERSION usually don't ("1.0.1") — confirmed
 * against the real repo (`v1.0.1` tag vs `1.0.1` in package.json). Comparing
 * the raw strings would report "update available" when actually up to date.
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
  const githubToken = process.env.UPDATE_GITHUB_TOKEN
  const repo = process.env.UPDATE_GITHUB_REPO // e.g. "neosaastech/neosaas-website"
  const workflowFile = process.env.UPDATE_WORKFLOW_FILE || 'apply-update.yml'

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
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
 * Vercel-hosted sites set UPDATE_GITHUB_TOKEN/UPDATE_GITHUB_REPO;
 * self-hosted customers set UPDATE_ORCHESTRATOR_WEBHOOK_URL/UPDATE_SYSTEM_TOKEN.
 * Neither configured → 501, no silent no-op.
 */
async function deployUpdate(userId?: string): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  if (process.env.UPDATE_GITHUB_TOKEN && process.env.UPDATE_GITHUB_REPO) {
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
        'No update mechanism configured — set UPDATE_GITHUB_TOKEN/UPDATE_GITHUB_REPO (Vercel-hosted sites) or UPDATE_ORCHESTRATOR_WEBHOOK_URL/UPDATE_SYSTEM_TOKEN (self-hosted).',
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
