/**
 * PilotAction — declarative commands for POST /api/admin/pilot/apply (Pilier E).
 * Extends the existing ad-hoc pattern in scripts/sync-pages.ts (a hardcoded TS array
 * synced at build time) into a JSON format applicable on demand, by a human admin or
 * an agent (Leon, Charlotte, Claude Code...).
 *
 * Only the actions with a real backing table today are implemented: create_page
 * (page_permissions), set_layers (page_layers, Pilier C). update_content and
 * configure_service from the Notion spec need the CMS (Pilier A) / Vault multi-tenant
 * (Pilier B) work that's currently deferred — not added until those land.
 */
import { z } from "zod"

export const accessLevelSchema = z.enum(["public", "user", "admin", "super_admin"])

export const createPageActionSchema = z.object({
  action: z.literal("create_page"),
  payload: z.object({
    path: z.string().min(1),
    name: z.string().min(1),
    access: accessLevelSchema,
    group: z.string().min(1),
  }),
})

export const setLayersActionSchema = z.object({
  action: z.literal("set_layers"),
  payload: z.object({
    pagePath: z.string().min(1),
    layers: z.array(
      z.object({
        layerType: z.string().min(1),
        position: z.number().int().nonnegative(),
        props: z.record(z.string(), z.unknown()),
      })
    ),
  }),
})

export const setPlatformConfigActionSchema = z.object({
  action: z.literal("set_platform_config"),
  payload: z.object({
    key: z.string().min(1),
    value: z.string(),
  }),
})

export const pilotActionSchema = z.discriminatedUnion("action", [
  createPageActionSchema,
  setLayersActionSchema,
  setPlatformConfigActionSchema,
])

export type PilotAction = z.infer<typeof pilotActionSchema>

export const pilotRequestSchema = z.object({
  actions: z.array(pilotActionSchema).min(1),
  dryRun: z.boolean().optional().default(false),
})

export type PilotRequest = z.infer<typeof pilotRequestSchema>
