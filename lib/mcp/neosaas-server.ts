import { featureRegistry } from "@/lib/dashboard/feature-registry"
import type { McpAuthContext } from "@/lib/mcp/auth"
import {
  buildPreviewDiff,
  changeSetInputSchema,
  extractContentArticlesFromChangeSet,
  extractContentPagesFromChangeSet,
  extractPilotActionsFromChangeSet,
  getChangeSet,
  markChangeSetPublished,
  storeChangeSet,
  validateChangeSet,
} from "@/lib/mcp/changeset"
import { publishContentArticleToPayload, publishContentPageToPayload } from "@/lib/mcp/content-hub-executor"
import {
  blogPostWriteInputSchema,
  planContentArticleSave,
  proposeContentArticleFromIntent,
} from "@/lib/mcp/content-hub-article"
import {
  CONTENT_HUB_BLOCK_TYPES,
  pageWriteInputSchema,
  planContentPageSave,
  proposeContentPageFromIntent,
} from "@/lib/mcp/content-hub-page"
import { executePilotRequest } from "@/lib/mcp/pilot-executor"
import { proposeFeatureModule } from "@/lib/mcp/propose-feature"
import { pilotRequestSchema } from "@/lib/pilot/actions"

interface JsonRpcRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

interface JsonRpcSuccess {
  jsonrpc: "2.0"
  id: string | number | null
  result: unknown
}

interface JsonRpcError {
  jsonrpc: "2.0"
  id: string | number | null
  error: {
    code: number
    message: string
    data?: unknown
  }
}

const WRITE_TOOLS = new Set([
  "apply_pilot_actions",
  "validate_change_set",
  "preview_diff",
  "publish_change_set",
  "propose_feature_module",
  "propose_content_page",
  "validate_content_page",
  "propose_content_article",
  "validate_content_article",
])

function rpcError(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcError {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  }
}

function rpcSuccess(id: string | number | null, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result }
}

function getTools() {
  return [
    {
      name: "list_features",
      description: "List available metadata-driven dashboard features",
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
    },
    {
      name: "get_feature",
      description: "Get a single feature config by slug",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["feature"],
        properties: { feature: { type: "string", minLength: 1 } },
      },
    },
    {
      name: "list_content_blocks",
      description: "List Content Hub block types (PageEditor / admin/content model)",
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
    },
    {
      name: "propose_content_page",
      description: "Propose a Content Hub page (PageWriteInput + layout blocks) from intent",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["intent"],
        properties: {
          intent: { type: "string", minLength: 3 },
          title: { type: "string" },
          slug: { type: "string" },
          pageType: { type: "string" },
          locale: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
        },
      },
    },
    {
      name: "validate_content_page",
      description: "Validate a Content Hub PageWriteInput (same rules as PageEditor)",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["page"],
        properties: {
          page: { type: "object" },
          locale: { type: "string" },
        },
      },
    },
    {
      name: "propose_content_article",
      description: "Propose a Content Hub article (BlogPostWriteInput) from intent",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["intent"],
        properties: {
          intent: { type: "string", minLength: 3 },
          title: { type: "string" },
          slug: { type: "string" },
          locale: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
        },
      },
    },
    {
      name: "validate_content_article",
      description: "Validate a Content Hub BlogPostWriteInput (same rules as ArticleEditor)",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["article"],
        properties: {
          article: { type: "object" },
          locale: { type: "string" },
        },
      },
    },
    {
      name: "propose_feature_module",
      description: "Propose a metadata-driven dashboard module from natural-language intent",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["intent"],
        properties: {
          intent: { type: "string", minLength: 3 },
          vertical: { type: "string" },
          slug: { type: "string" },
          title: { type: "string" },
          endpoint: { type: "string" },
        },
      },
    },
    {
      name: "validate_change_set",
      description: "Validate a build change set and store it for preview/publish",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["operations"],
        properties: {
          vertical: { type: "string" },
          operations: { type: "array", minItems: 1, items: { type: "object" } },
        },
      },
    },
    {
      name: "preview_diff",
      description: "Preview the diff for a validated change set",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["changeSetId"],
        properties: { changeSetId: { type: "string", minLength: 1 } },
      },
    },
    {
      name: "publish_change_set",
      description: "Publish a validated change set (Content Hub pages/articles via Payload, or legacy pilot actions)",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["changeSetId"],
        properties: { changeSetId: { type: "string", minLength: 1 } },
      },
    },
    {
      name: "apply_pilot_actions",
      description: "Validate or apply pilot actions (dryRun defaults to true)",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["actions"],
        properties: {
          actions: { type: "array", minItems: 1, items: { type: "object" } },
          dryRun: { type: "boolean", default: true },
        },
      },
    },
  ] as const
}

async function callTool(
  name: string,
  argumentsPayload: Record<string, unknown> | undefined,
  auth: McpAuthContext,
): Promise<unknown> {
  if (name === "list_features") {
    return {
      features: Object.entries(featureRegistry).map(([slug, config]) => ({
        slug,
        title: config.title,
        endpoint: config.endpoint,
        fieldCount: config.fields.length,
      })),
    }
  }

  if (name === "get_feature") {
    const feature = typeof argumentsPayload?.feature === "string" ? argumentsPayload.feature : ""
    if (!feature) throw new Error("Missing required argument: feature")
    const config = featureRegistry[feature]
    if (!config) throw new Error(`Unknown feature: ${feature}`)
    return { feature, config }
  }

  if (name === "list_content_blocks") {
    return { blockTypes: CONTENT_HUB_BLOCK_TYPES }
  }

  if (name === "propose_content_page") {
    const intent = typeof argumentsPayload?.intent === "string" ? argumentsPayload.intent : ""
    if (!intent) throw new Error("Missing required argument: intent")
    return proposeContentPageFromIntent({
      intent,
      title: typeof argumentsPayload?.title === "string" ? argumentsPayload.title : undefined,
      slug: typeof argumentsPayload?.slug === "string" ? argumentsPayload.slug : undefined,
      pageType: typeof argumentsPayload?.pageType === "string" ? argumentsPayload.pageType : undefined,
      locale: typeof argumentsPayload?.locale === "string" ? argumentsPayload.locale : undefined,
      status:
        argumentsPayload?.status === "draft" || argumentsPayload?.status === "published"
          ? argumentsPayload.status
          : undefined,
    })
  }

  if (name === "validate_content_page") {
    const parsed = pageWriteInputSchema.safeParse(argumentsPayload?.page)
    if (!parsed.success) throw new Error(`Invalid PageWriteInput: ${parsed.error.message}`)
    const locale = typeof argumentsPayload?.locale === "string" ? argumentsPayload.locale : "en"
    return planContentPageSave({ page: parsed.data, locale })
  }

  if (name === "propose_content_article") {
    const intent = typeof argumentsPayload?.intent === "string" ? argumentsPayload.intent : ""
    if (!intent) throw new Error("Missing required argument: intent")
    return proposeContentArticleFromIntent({
      intent,
      title: typeof argumentsPayload?.title === "string" ? argumentsPayload.title : undefined,
      slug: typeof argumentsPayload?.slug === "string" ? argumentsPayload.slug : undefined,
      locale: typeof argumentsPayload?.locale === "string" ? argumentsPayload.locale : undefined,
      status:
        argumentsPayload?.status === "draft" || argumentsPayload?.status === "published"
          ? argumentsPayload.status
          : undefined,
    })
  }

  if (name === "validate_content_article") {
    const parsed = blogPostWriteInputSchema.safeParse(argumentsPayload?.article)
    if (!parsed.success) throw new Error(`Invalid BlogPostWriteInput: ${parsed.error.message}`)
    const locale = typeof argumentsPayload?.locale === "string" ? argumentsPayload.locale : "en"
    return planContentArticleSave({ article: parsed.data, locale })
  }

  if (name === "propose_feature_module") {
    const intent = typeof argumentsPayload?.intent === "string" ? argumentsPayload.intent : ""
    if (!intent) throw new Error("Missing required argument: intent")
    return proposeFeatureModule({
      intent,
      vertical: typeof argumentsPayload?.vertical === "string" ? argumentsPayload.vertical : undefined,
      slug: typeof argumentsPayload?.slug === "string" ? argumentsPayload.slug : undefined,
      title: typeof argumentsPayload?.title === "string" ? argumentsPayload.title : undefined,
      endpoint: typeof argumentsPayload?.endpoint === "string" ? argumentsPayload.endpoint : undefined,
    })
  }

  if (name === "validate_change_set") {
    const parsed = changeSetInputSchema.safeParse(argumentsPayload)
    if (!parsed.success) throw new Error(`Invalid change set: ${parsed.error.message}`)
    const validation = validateChangeSet(parsed.data)
    if (!validation.valid) {
      return { valid: false, errors: validation.errors, warnings: validation.warnings, preview: validation.preview }
    }
    const stored = storeChangeSet(parsed.data)
    return {
      valid: true,
      changeSetId: stored.id,
      errors: [],
      warnings: validation.warnings,
      preview: validation.preview,
    }
  }

  if (name === "preview_diff") {
    const changeSetId = typeof argumentsPayload?.changeSetId === "string" ? argumentsPayload.changeSetId : ""
    if (!changeSetId) throw new Error("Missing required argument: changeSetId")
    const changeSet = getChangeSet(changeSetId)
    if (!changeSet) throw new Error(`Unknown change set: ${changeSetId}`)
    return buildPreviewDiff(changeSet)
  }

  if (name === "publish_change_set") {
    const changeSetId = typeof argumentsPayload?.changeSetId === "string" ? argumentsPayload.changeSetId : ""
    if (!changeSetId) throw new Error("Missing required argument: changeSetId")
    const changeSet = getChangeSet(changeSetId)
    if (!changeSet) throw new Error(`Unknown change set: ${changeSetId}`)
    if (changeSet.status === "published") throw new Error("Change set already published")

    const validation = validateChangeSet(changeSet)
    if (!validation.valid) throw new Error(`Change set invalid: ${validation.errors.join("; ")}`)

    const contentPages = extractContentPagesFromChangeSet(changeSet)
    const contentArticles = extractContentArticlesFromChangeSet(changeSet)
    const pilotActions = extractPilotActionsFromChangeSet(changeSet)
    const publishedContentPages: Array<{ id: string | number; path: string; locale: string }> = []
    const publishedContentArticles: Array<{ id: string | number; slug: string; locale: string }> = []

    for (const entry of contentPages) {
      const doc = await publishContentPageToPayload(entry.page, entry.locale)
      publishedContentPages.push({ id: doc.id, path: doc.path, locale: entry.locale })
    }

    for (const entry of contentArticles) {
      const doc = await publishContentArticleToPayload(entry.article, entry.locale)
      publishedContentArticles.push({ id: doc.id, slug: doc.slug, locale: entry.locale })
    }

    let pilotResult: Awaited<ReturnType<typeof executePilotRequest>> | null = null
    if (pilotActions.length > 0) {
      pilotResult = await executePilotRequest({
        actions: pilotActions,
        dryRun: false,
        actorUserId: auth.userId === "mcp-agent" ? undefined : auth.userId,
        actorType: auth.actorType,
      })
      if (pilotResult.result !== "success") {
        throw new Error(
          `Pilot publish failed: ${pilotResult.results.filter((r) => r.error).map((r) => r.error).join("; ")}`,
        )
      }
    }

    if (contentPages.length === 0 && contentArticles.length === 0 && pilotActions.length === 0) {
      return {
        changeSetId,
        result: "success",
        publishedContentPages: 0,
        publishedContentArticles: 0,
        publishedPilotActions: 0,
        notes: ["No content_page, content_article, or pilot_actions operations to publish"],
      }
    }

    markChangeSetPublished(changeSetId)
    return {
      changeSetId,
      result: "success",
      publishedContentPages: publishedContentPages.length,
      contentPages: publishedContentPages,
      publishedContentArticles: publishedContentArticles.length,
      contentArticles: publishedContentArticles,
      publishedPilotActions: pilotActions.length,
      pilotResults: pilotResult?.results ?? [],
      notes:
        pilotActions.length > 0
          ? ["pilot_actions applied directly to page_layers — prefer content_page for marketing pages"]
          : [],
    }
  }

  if (name === "apply_pilot_actions") {
    const parsed = pilotRequestSchema.safeParse({
      actions: argumentsPayload?.actions,
      dryRun: argumentsPayload?.dryRun ?? true,
    })
    if (!parsed.success) throw new Error(`Invalid PilotRequest: ${parsed.error.message}`)

    const execution = await executePilotRequest({
      actions: parsed.data.actions,
      dryRun: parsed.data.dryRun,
      actorUserId: auth.userId === "mcp-agent" ? undefined : auth.userId,
      actorType: auth.actorType,
      skipAudit: parsed.data.dryRun,
    })

    return execution
  }

  throw new Error(`Unknown tool: ${name}`)
}

function toolRequiresAuth(toolName: string): boolean {
  return (
    WRITE_TOOLS.has(toolName) ||
    toolName === "list_features" ||
    toolName === "get_feature" ||
    toolName === "list_content_blocks"
  )
}

export async function handleNeosaasMcpRequest(
  input: unknown,
  auth: McpAuthContext | null,
): Promise<JsonRpcSuccess | JsonRpcError> {
  const req = (input ?? {}) as JsonRpcRequest
  const id = req.id ?? null

  if (req.jsonrpc !== "2.0") return rpcError(id, -32600, "Invalid Request: jsonrpc must be '2.0'")
  if (!req.method || typeof req.method !== "string") return rpcError(id, -32600, "Invalid Request: method is required")

  try {
    if (req.method === "initialize") {
      return rpcSuccess(id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "neosaas-mcp", version: "0.3.1" },
        capabilities: { tools: {} },
      })
    }

    if (req.method === "tools/list") {
      return rpcSuccess(id, { tools: getTools() })
    }

    if (req.method === "tools/call") {
      const params = req.params ?? {}
      const name = typeof params.name === "string" ? params.name : ""
      if (!name) return rpcError(id, -32602, "Invalid params: tools/call requires params.name")

      if (toolRequiresAuth(name) && !auth) {
        return rpcError(id, -32001, "Unauthorized — admin session or NEOSAAS_MCP_TOKEN required")
      }

      const argsRaw = params.arguments
      const args =
        argsRaw && typeof argsRaw === "object" && !Array.isArray(argsRaw)
          ? (argsRaw as Record<string, unknown>)
          : undefined

      if (WRITE_TOOLS.has(name) && !auth) {
        return rpcError(id, -32001, "Unauthorized — write tools require admin or MCP token")
      }

      const result = await callTool(name, args, auth as McpAuthContext)
      return rpcSuccess(id, { content: [{ type: "json", json: result }] })
    }

    return rpcError(id, -32601, `Method not found: ${req.method}`)
  } catch (error) {
    return rpcError(id, -32000, error instanceof Error ? error.message : String(error))
  }
}

export { getTools }
