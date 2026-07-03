import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { pageLayers, pagePermissions, pilotActionsLog, platformConfig } from "@/db/schema"
import { verifyAdminAuth } from "@/lib/auth/admin-auth"
import { layerRegistry } from "@/lib/layers/registry"
import { pilotRequestSchema, type PilotAction } from "@/lib/pilot/actions"

interface ActionResult {
  action: string
  status: "applied" | "would_apply" | "error"
  error?: string
}

function validateAction(action: PilotAction): string | null {
  if (action.action !== "set_layers") return null
  for (const layer of action.payload.layers) {
    const def = layerRegistry[layer.layerType]
    if (!def) return `Unknown layerType "${layer.layerType}"`
    const parsed = def.propsSchema.safeParse(layer.props)
    if (!parsed.success) {
      return `Invalid props for layerType "${layer.layerType}": ${parsed.error.message}`
    }
  }
  return null
}

async function applyAction(action: PilotAction): Promise<void> {
  switch (action.action) {
    case "create_page": {
      const { path, name, access, group } = action.payload
      await db
        .insert(pagePermissions)
        .values({ path, name, access, group })
        .onConflictDoUpdate({
          target: pagePermissions.path,
          set: { name, access, group, updatedAt: new Date() },
        })
      break
    }
    case "set_layers": {
      const { pagePath, layers } = action.payload
      // Replace-all, not cumulative — a client that retries after a timeout
      // must not duplicate layers (idempotence requirement from the spec).
      await db.delete(pageLayers).where(eq(pageLayers.pagePath, pagePath))
      if (layers.length > 0) {
        await db.insert(pageLayers).values(
          layers.map((l) => ({
            pagePath,
            position: l.position,
            layerType: l.layerType,
            props: l.props,
          }))
        )
      }
      break
    }
    case "set_platform_config": {
      const { key, value } = action.payload
      await db
        .insert(platformConfig)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: platformConfig.key,
          set: { value, updatedAt: new Date() },
        })
      break
    }
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: authResult.isAuthenticated ? 403 : 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = pilotRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid PilotRequest", details: parsed.error.format() },
      { status: 400 }
    )
  }

  const { actions, dryRun } = parsed.data
  const results: ActionResult[] = []

  for (const action of actions) {
    const validationError = validateAction(action)
    if (validationError) {
      results.push({ action: action.action, status: "error", error: validationError })
      continue
    }
    if (dryRun) {
      results.push({ action: action.action, status: "would_apply" })
      continue
    }
    try {
      await applyAction(action)
      results.push({ action: action.action, status: "applied" })
    } catch (error) {
      results.push({
        action: action.action,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const errors = results.filter((r) => r.status === "error")
  const result = errors.length === 0 ? "success" : errors.length === results.length ? "failed" : "partial"

  await db.insert(pilotActionsLog).values({
    actorUserId: authResult.userId,
    actorType: "human",
    actions,
    result,
    errors: errors.length > 0 ? errors : null,
    dryRun,
  })

  return NextResponse.json({ result, dryRun, results })
}
