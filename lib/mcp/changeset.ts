import { randomUUID } from "crypto"
import { z } from "zod"
import { pilotActionSchema, pilotRequestSchema } from "@/lib/pilot/actions"
import type { FeatureConfig } from "@/types/form-builder"
import type { PageWriteInput, BlogPostWriteInput } from "@/lib/payload-bridge"
import defaultVerticalRules from "@/config/vertical-rules/default.json"
import { blogPostWriteInputSchema, validateContentHubArticleInput } from "@/lib/mcp/content-hub-article"
import { pageWriteInputSchema, validateContentHubPageInput } from "@/lib/mcp/content-hub-page"
import { featureFieldConfigSchema } from "@/lib/mcp/propose-feature"
import { summarizePilotDiff, validatePilotAction } from "@/lib/mcp/pilot-executor"

const VERTICAL_RULES: Record<string, { requiredModuleFields?: string[]; warnings?: string[] }> = {
  default: defaultVerticalRules,
}

const pilotOperationSchema = z.object({
  type: z.literal("pilot_actions"),
  payload: pilotRequestSchema,
})

const featureModuleOperationSchema = z.object({
  type: z.literal("feature_module"),
  payload: z.object({
    slug: z.string().min(1),
    config: z.object({
      title: z.string().min(1),
      endpoint: z.string().min(1),
      fields: z.array(featureFieldConfigSchema).min(1),
    }),
  }),
})

const contentPageOperationSchema = z.object({
  type: z.literal("content_page"),
  payload: z.object({
    locale: z.string().min(2).default("en"),
    page: pageWriteInputSchema,
  }),
})

const contentArticleOperationSchema = z.object({
  type: z.literal("content_article"),
  payload: z.object({
    locale: z.string().min(2).default("en"),
    article: blogPostWriteInputSchema,
  }),
})

export const changeSetOperationSchema = z.discriminatedUnion("type", [
  pilotOperationSchema,
  featureModuleOperationSchema,
  contentPageOperationSchema,
  contentArticleOperationSchema,
])

export const changeSetInputSchema = z.object({
  vertical: z.string().min(1).optional(),
  operations: z.array(changeSetOperationSchema).min(1),
})

export type ChangeSetInput = z.infer<typeof changeSetInputSchema>
export type StoredChangeSet = ChangeSetInput & {
  id: string
  createdAt: string
  status: "validated" | "published"
}

const changeSetStore = new Map<string, StoredChangeSet>()

export function storeChangeSet(input: ChangeSetInput): StoredChangeSet {
  const stored: StoredChangeSet = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "validated",
  }
  changeSetStore.set(stored.id, stored)
  return stored
}

export function getChangeSet(changeSetId: string): StoredChangeSet | null {
  return changeSetStore.get(changeSetId) ?? null
}

export function markChangeSetPublished(changeSetId: string): void {
  const existing = changeSetStore.get(changeSetId)
  if (!existing) return
  changeSetStore.set(changeSetId, { ...existing, status: "published" })
}

function loadVerticalRules(vertical?: string): { requiredModuleFields?: string[]; warnings?: string[] } {
  if (!vertical) return {}
  const rules = VERTICAL_RULES[vertical]
  if (!rules) return { warnings: [`No vertical rules file found for "${vertical}"`] }
  return rules
}

function validateFeatureModuleOperation(
  payload: z.infer<typeof featureModuleOperationSchema>["payload"],
  vertical?: string,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const rules = loadVerticalRules(vertical)

  for (const warning of rules.warnings ?? []) {
    warnings.push(warning)
  }

  const required = rules.requiredModuleFields ?? []
  const fieldNames = new Set(payload.config.fields.map((f) => f.name))
  for (const requiredField of required) {
    if (!fieldNames.has(requiredField)) {
      errors.push(`Vertical rule missing required field: ${requiredField}`)
    }
  }

  if (payload.slug !== payload.config.endpoint && !payload.slug.match(/^[a-z0-9-]+$/)) {
    warnings.push("Feature slug should be lowercase kebab-case for dashboard routes")
  }

  return { errors, warnings }
}

export function validateChangeSet(input: ChangeSetInput): {
  valid: boolean
  errors: string[]
  warnings: string[]
  preview: Array<Record<string, unknown>>
} {
  const errors: string[] = []
  const warnings: string[] = []
  const preview: Array<Record<string, unknown>> = []

  for (const [index, operation] of input.operations.entries()) {
    if (operation.type === "pilot_actions") {
      for (const action of operation.payload.actions) {
        const parsed = pilotActionSchema.safeParse(action)
        if (!parsed.success) {
          errors.push(`operations[${index}] invalid pilot action: ${parsed.error.message}`)
          continue
        }
        const validationError = validatePilotAction(parsed.data)
        if (validationError) errors.push(`operations[${index}] ${validationError}`)
      }
      preview.push(...summarizePilotDiff(operation.payload.actions))
      continue
    }

    if (operation.type === "content_page") {
      const validation = validateContentHubPageInput(operation.payload.page)
      errors.push(...validation.errors.map((e) => `operations[${index}] ${e}`))
      warnings.push(...validation.warnings.map((w) => `operations[${index}] ${w}`))
      preview.push({
        type: "content_page",
        target: `/${operation.payload.locale}/${operation.payload.page.slug || ""}`.replace(/\/$/, "") || "/",
        summary: `Content Hub page "${operation.payload.page.title}" (${operation.payload.page._status})`,
        after: {
          title: operation.payload.page.title,
          slug: operation.payload.page.slug,
          blockCount: operation.payload.page.layout.length,
          locale: operation.payload.locale,
        },
      })
      continue
    }

    if (operation.type === "content_article") {
      const validation = validateContentHubArticleInput(operation.payload.article)
      errors.push(...validation.errors.map((e) => `operations[${index}] ${e}`))
      warnings.push(...validation.warnings.map((w) => `operations[${index}] ${w}`))
      preview.push({
        type: "content_article",
        target: `/${operation.payload.locale}/blog/${operation.payload.article.slug}`,
        summary: `Content Hub article "${operation.payload.article.title}" (${operation.payload.article._status})`,
        after: {
          title: operation.payload.article.title,
          slug: operation.payload.article.slug,
          locale: operation.payload.locale,
          hasBody: Boolean(operation.payload.article.body),
        },
      })
      continue
    }

    const featureValidation = validateFeatureModuleOperation(operation.payload, input.vertical)
    errors.push(...featureValidation.errors.map((e) => `operations[${index}] ${e}`))
    warnings.push(...featureValidation.warnings.map((w) => `operations[${index}] ${w}`))
    preview.push({
      type: "feature_module",
      target: `/dashboard/${operation.payload.slug}`,
      summary: `Propose dashboard module "${operation.payload.config.title}"`,
      after: operation.payload,
    })
  }

  return { valid: errors.length === 0, errors, warnings, preview }
}

export function buildPreviewDiff(changeSet: StoredChangeSet): {
  changeSetId: string
  vertical?: string
  status: StoredChangeSet["status"]
  operations: number
  diff: Array<Record<string, unknown>>
  publishable: boolean
  notes: string[]
} {
  const notes: string[] = []
  const hasFeatureModule = changeSet.operations.some((op) => op.type === "feature_module")
  if (hasFeatureModule) {
    notes.push("feature_module operations are preview-only until registry write support lands")
  }
  const hasContentPage = changeSet.operations.some((op) => op.type === "content_page")
  if (hasContentPage) {
    notes.push("content_page publish writes to Payload — page_layers sync runs on publish via payload-cms hooks")
  }
  const hasContentArticle = changeSet.operations.some((op) => op.type === "content_article")
  if (hasContentArticle) {
    notes.push("content_article publish writes to Payload blog-posts collection")
  }

  const validation = validateChangeSet(changeSet)
  return {
    changeSetId: changeSet.id,
    vertical: changeSet.vertical,
    status: changeSet.status,
    operations: changeSet.operations.length,
    diff: validation.preview,
    publishable: validation.valid && changeSet.status === "validated",
    notes,
  }
}

export function extractPilotActionsFromChangeSet(changeSet: StoredChangeSet) {
  return changeSet.operations
    .filter((op): op is z.infer<typeof pilotOperationSchema> => op.type === "pilot_actions")
    .flatMap((op) => op.payload.actions)
}

export function extractContentPagesFromChangeSet(changeSet: StoredChangeSet): Array<{
  locale: string
  page: PageWriteInput
}> {
  return changeSet.operations
    .filter((op): op is z.infer<typeof contentPageOperationSchema> => op.type === "content_page")
    .map((op) => ({ locale: op.payload.locale, page: op.payload.page }))
}

export function extractContentArticlesFromChangeSet(changeSet: StoredChangeSet): Array<{
  locale: string
  article: BlogPostWriteInput
}> {
  return changeSet.operations
    .filter((op): op is z.infer<typeof contentArticleOperationSchema> => op.type === "content_article")
    .map((op) => ({ locale: op.payload.locale, article: op.payload.article }))
}

export function extractFeatureModulesFromChangeSet(changeSet: StoredChangeSet): Array<{
  slug: string
  config: FeatureConfig
}> {
  return changeSet.operations
    .filter((op): op is z.infer<typeof featureModuleOperationSchema> => op.type === "feature_module")
    .map((op) => ({ slug: op.payload.slug, config: op.payload.config }))
}

/** Test helper */
export function clearChangeSetStore(): void {
  changeSetStore.clear()
}
