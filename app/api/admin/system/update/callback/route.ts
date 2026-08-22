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

const CallbackBodySchema = z.object({
  status: z.enum(['succeeded', 'failed']),
  version: z.string().nullish(),
  error: z.string().nullish(),
})

interface UpdateJob {
  status: 'pending' | 'succeeded' | 'failed' | 'denied'
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
  const now = new Date().toISOString()

  await writeJob({
    status: body.status,
    version,
    startedAt: existingJob?.startedAt ?? now,
    finishedAt: now,
    error: body.error ?? undefined,
    triggeredBy: existingJob?.triggeredBy,
  })

  await logSystemEvent({
    category: 'system_update',
    level: body.status === 'succeeded' ? 'info' : 'error',
    message: `Update ${body.status}${version ? ` (${version})` : ''}${body.error ? `: ${body.error}` : ''}`,
    userId: existingJob?.triggeredBy,
  })

  await sendAdminNotification({
    subject: body.status === 'succeeded' ? `Update succeeded${version ? ` — ${version}` : ''}` : 'Update failed',
    message:
      body.status === 'succeeded'
        ? `✅ **System update succeeded**\n\n${version ? `Now running ${version}.` : 'The instance is up to date.'}`
        : `❌ **System update failed**\n\n${body.error || 'The build or deployment failed — check the GitHub Actions run for details.'}`,
    type: 'system',
    mode: body.status === 'succeeded' ? 'informative' : 'interactive',
    userId: existingJob?.triggeredBy,
    priority: body.status === 'succeeded' ? 'normal' : 'high',
    category: body.status === 'succeeded' ? 'action' : 'urgent',
    superAdminOnly: true,
    metadata: {
      notificationType: body.status === 'succeeded' ? 'system_update_succeeded' : 'system_update_failed',
      actionRequired: body.status === 'failed',
      version,
    },
  })

  return NextResponse.json({ success: true })
}
