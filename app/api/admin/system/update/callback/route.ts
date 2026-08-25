/**
 * Called by this site's own .github/workflows/apply-update.yml at the end
 * of a run (success or failure) to report the REAL build/deploy outcome
 * back into the app -- POST /api/admin/system/update only ever knows that
 * the GitHub workflow_dispatch call itself was accepted, not whether the
 * actual Dokploy build succeeded, which is why this exists at all.
 *
 * Auth: shared secret header (x-update-callback-secret), not a user
 * session -- the caller is a GitHub Actions runner, not a logged-in admin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logSystemEvent } from '@/app/actions/logs'
import { sendAdminNotification } from '@/lib/notifications/admin-notifications'

const JOB_CONFIG_KEY = 'system_update_job'

// Charles (2026-08-25, v1.29.0 test): apply-update.yml is PR-gated on this
// repo (see the workflow's own header) -- it never deploys by itself. The
// old two-outcome model reported "succeeded" the instant the sync branch
// was pushed and a PR opened, which is a real false positive: the header
// icon went green and the admin notification said "Now running v1.29.0"
// while PR #17 sat unmerged and the live version never moved. "succeeded"
// is now reserved for "genuinely nothing to do" (the sync found no diff);
// "pr_opened" is the honest outcome for "automation finished, a human still
// has to review and merge" -- distinct icon/message, carries the PR link.
const CallbackBodySchema = z.object({
  status: z.enum(['succeeded', 'pr_opened', 'up_to_date', 'failed']),
  version: z.string().nullish(),
  prUrl: z.string().nullish(),
  error: z.string().nullish(),
})

interface UpdateJob {
  status: 'pending' | 'succeeded' | 'pr_opened' | 'up_to_date' | 'failed' | 'denied'
  version: string | null
  prUrl?: string | null
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

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.UPDATE_CALLBACK_SECRET
  if (!expectedSecret) {
    console.error('[system/update/callback] UPDATE_CALLBACK_SECRET not configured')
    return NextResponse.json({ error: 'Callback not configured' }, { status: 501 })
  }

  const providedSecret = request.headers.get('x-update-callback-secret')
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: z.infer<typeof CallbackBodySchema>
  try {
    body = CallbackBodySchema.parse(await request.json())
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body — expected { status: "succeeded" | "failed", version?, error? }' },
      { status: 400 },
    )
  }

  const existingJob = await readJob()
  const version = body.version ?? existingJob?.version ?? null
  const prUrl = body.prUrl ?? null
  const now = new Date().toISOString()

  await writeJob({
    status: body.status,
    version,
    prUrl,
    startedAt: existingJob?.startedAt ?? now,
    finishedAt: now,
    error: body.error ?? undefined,
    triggeredBy: existingJob?.triggeredBy,
  })

  await logSystemEvent({
    category: 'system_update',
    level: body.status === 'failed' ? 'error' : 'info',
    message: `Update ${body.status}${version ? ` (${version})` : ''}${prUrl ? ` — ${prUrl}` : ''}${body.error ? `: ${body.error}` : ''}`,
    userId: existingJob?.triggeredBy,
  })

  const subject =
    body.status === 'pr_opened'
      ? `Update ready for review${version ? ` — ${version}` : ''}`
      : body.status === 'up_to_date' || body.status === 'succeeded'
        ? `Already up to date${version ? ` — ${version}` : ''}`
        : 'Update failed'

  const message =
    body.status === 'pr_opened'
      ? `🔍 **Update ready for review**\n\nThe automated sync for ${version ?? 'the latest release'} finished and opened a pull request — nothing is deployed yet, it only ships once you review and merge it.${prUrl ? `\n\n${prUrl}` : ''}`
      : body.status === 'up_to_date' || body.status === 'succeeded'
        ? `✅ **Already up to date**\n\n${version ? `${version} is already applied — nothing to sync.` : 'The instance is up to date.'}`
        : `❌ **System update failed**\n\n${body.error || 'The build or deployment failed — check the GitHub Actions run for details.'}`

  await sendAdminNotification({
    subject,
    message,
    type: 'system',
    mode: body.status === 'failed' || body.status === 'pr_opened' ? 'interactive' : 'informative',
    userId: existingJob?.triggeredBy,
    priority: body.status === 'failed' ? 'high' : 'normal',
    category: body.status === 'failed' ? 'urgent' : 'action',
    superAdminOnly: true,
    metadata: {
      notificationType:
        body.status === 'pr_opened'
          ? 'system_update_pr_opened'
          : body.status === 'failed'
            ? 'system_update_failed'
            : 'system_update_succeeded',
      actionRequired: body.status === 'failed' || body.status === 'pr_opened',
      version,
      prUrl,
    },
  })

  return NextResponse.json({ success: true })
}
