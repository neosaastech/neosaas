import { eq } from "drizzle-orm"
import { db } from "@/db"
import { pageLayers, pagePermissions, pilotActionsLog, platformConfig } from "@/db/schema"
import { layerRegistry } from "@/lib/layers/registry"
import { type PilotAction } from "@/lib/pilot/actions"

export interface PilotActionResult {
  action: string
  status: "applied" | "would_apply" | "error"
  error?: string
}

export function validatePilotAction(action: PilotAction): string | null {
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

export async function applyPilotAction(action: PilotAction): Promise<void> {
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
      await db.delete(pageLayers).where(eq(pageLayers.pagePath, pagePath))
      if (layers.length > 0) {
        await db.insert(pageLayers).values(
          layers.map((l) => ({
            pagePath,
            position: l.position,
            layerType: l.layerType,
            props: l.props,
          })),
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

export async function executePilotRequest(options: {
  actions: PilotAction[]
  dryRun: boolean
  actorUserId?: string
  actorType?: "human" | "agent"
  skipAudit?: boolean
}): Promise<{ result: "success" | "partial" | "failed"; dryRun: boolean; results: PilotActionResult[] }> {
  const { actions, dryRun, actorUserId, actorType = "human", skipAudit = false } = options
  const results: PilotActionResult[] = []

  for (const action of actions) {
    const validationError = validatePilotAction(action)
    if (validationError) {
      results.push({ action: action.action, status: "error", error: validationError })
      continue
    }
    if (dryRun) {
      results.push({ action: action.action, status: "would_apply" })
      continue
    }
    try {
      await applyPilotAction(action)
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

  if (!skipAudit && !dryRun) {
    await db.insert(pilotActionsLog).values({
      actorUserId: actorUserId ?? null,
      actorType,
      actions,
      result,
      errors: errors.length > 0 ? errors : null,
      dryRun,
    })
  }

  return { result, dryRun, results }
}

export function summarizePilotDiff(actions: PilotAction[]): Array<Record<string, unknown>> {
  return actions.map((action) => {
    switch (action.action) {
      case "create_page":
        return {
          type: "create_page",
          target: action.payload.path,
          summary: `Register page permission "${action.payload.name}" (${action.payload.access})`,
          after: action.payload,
        }
      case "set_layers":
        return {
          type: "set_layers",
          target: action.payload.pagePath,
          summary: `Replace ${action.payload.layers.length} layer(s) on ${action.payload.pagePath}`,
          after: action.payload.layers,
        }
      case "set_platform_config":
        return {
          type: "set_platform_config",
          target: action.payload.key,
          summary: `Set platform config "${action.payload.key}"`,
          after: { key: action.payload.key, value: action.payload.value },
        }
      default:
        return { type: "unknown", summary: "Unsupported action" }
    }
  })
}
