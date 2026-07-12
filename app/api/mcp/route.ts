import { NextRequest, NextResponse } from "next/server"
import { mcpAuthRequiredMessage, verifyMcpAuth } from "@/lib/mcp/auth"
import { handleNeosaasMcpRequest } from "@/lib/mcp/neosaas-server"

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: invalid JSON body" },
      },
      { status: 400 },
    )
  }

  const method = typeof (body as { method?: unknown })?.method === "string" ? (body as { method: string }).method : ""
  const toolName =
    method === "tools/call" && typeof (body as { params?: { name?: unknown } })?.params?.name === "string"
      ? (body as { params: { name: string } }).params.name
      : null

  const needsAuth =
    method === "tools/call" &&
    toolName !== null &&
    [
      "list_features",
      "get_feature",
      "list_content_blocks",
      "propose_content_page",
      "validate_content_page",
      "propose_content_article",
      "validate_content_article",
      "apply_pilot_actions",
      "validate_change_set",
      "preview_diff",
      "publish_change_set",
      "propose_feature_module",
    ].includes(toolName)

  const auth = needsAuth ? await verifyMcpAuth(request) : method === "tools/call" ? await verifyMcpAuth(request) : null

  if (needsAuth && !auth) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: (body as { id?: string | number | null })?.id ?? null,
        error: { code: -32001, message: mcpAuthRequiredMessage() },
      },
      { status: 401 },
    )
  }

  const response = await handleNeosaasMcpRequest(body, auth)
  const status = "error" in response && response.error.code === -32001 ? 401 : 200
  return NextResponse.json(response, { status })
}
