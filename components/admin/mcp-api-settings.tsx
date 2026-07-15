"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Key, Tag } from "lucide-react"
import { TemplateVariablesHint } from "@/components/admin/content/template-variables-hint"

// Mirrors getTools() in lib/mcp/neosaas-server.ts (name/description only —
// that module also imports server-only DB/executor code, unsafe to pull
// into a client component just to read its tool list).
const MCP_TOOLS = [
  { name: "list_features", description: "List available metadata-driven dashboard features" },
  { name: "get_feature", description: "Get a single feature config by slug" },
  { name: "list_content_blocks", description: "List Content Hub block types (PageEditor / admin/content model)" },
  { name: "propose_content_page", description: "Propose a Content Hub page (PageWriteInput + layout blocks) from intent" },
  { name: "validate_content_page", description: "Validate a Content Hub PageWriteInput (same rules as PageEditor)" },
  { name: "propose_content_article", description: "Propose a Content Hub article (BlogPostWriteInput) from intent" },
  { name: "validate_content_article", description: "Validate a Content Hub BlogPostWriteInput (same rules as ArticleEditor)" },
  { name: "propose_feature_module", description: "Propose a metadata-driven dashboard module from natural-language intent" },
  { name: "validate_change_set", description: "Validate a build change set and store it for preview/publish" },
  { name: "preview_diff", description: "Preview the diff for a validated change set" },
  { name: "publish_change_set", description: "Publish a validated change set (Content Hub pages/articles via Payload, or legacy pilot actions)" },
  { name: "apply_pilot_actions", description: "Validate or apply pilot actions (dryRun defaults to true)" },
]

/**
 * Charles (2026-07-15): documentation MCP/API + référence des merge-tags,
 * regroupées dans Parameters — la génération/révocation des tokens reste
 * dans API Management (voir components/admin/mcp-tokens-card.tsx), cet
 * onglet ne fait que documenter le protocole et les outils disponibles.
 */
export function McpApiSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-brand" />
            MCP Server
          </CardTitle>
          <CardDescription>Protocol, authentication and available tools for the NeoSaaS MCP server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Endpoint</p>
            <code className="block rounded bg-muted px-3 py-2 text-sm">POST /api/mcp</code>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" /> Authentication
            </p>
            <p className="text-sm text-muted-foreground">
              Either an authenticated admin session cookie, or a Bearer token in the{" "}
              <code className="rounded bg-muted px-1">Authorization</code> header. Generate and revoke tokens from{" "}
              <Link href="/admin/api" className="underline font-semibold hover:text-brand">
                API Management
              </Link>
              .
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Available tools</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MCP_TOOLS.map((tool) => (
                <div key={tool.name} className="rounded-lg border p-3">
                  <code className="text-xs font-semibold">{tool.name}</code>
                  <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-brand" />
            Merge tags
          </CardTitle>
          <CardDescription>Dynamic variables available in page/block text fields</CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateVariablesHint />
        </CardContent>
      </Card>
    </div>
  )
}
