import { NextRequest } from "next/server"
import { verifyAdminAuth } from "@/lib/auth/admin-auth"

export interface McpAuthContext {
  userId: string
  roles: string[]
  actorType: "human" | "agent"
  via: "session" | "token"
}

function getConfiguredMcpToken(): string | undefined {
  return process.env.NEOSAAS_MCP_TOKEN?.trim() || undefined
}

function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  return header.slice("Bearer ".length).trim() || null
}

export function isMcpTokenValid(request: NextRequest): boolean {
  const configured = getConfiguredMcpToken()
  if (!configured) return false
  const provided = extractBearerToken(request)
  return Boolean(provided && provided === configured)
}

export async function verifyMcpAuth(request: NextRequest): Promise<McpAuthContext | null> {
  if (isMcpTokenValid(request)) {
    return {
      userId: "mcp-agent",
      roles: ["super_admin"],
      actorType: "agent",
      via: "token",
    }
  }

  const sessionCookie = request.cookies.get("auth-token")?.value
  if (!sessionCookie) {
    return null
  }

  const authResult = await verifyAdminAuth(request)
  if (!authResult.isAuthenticated || !authResult.isAdmin || !authResult.userId) {
    return null
  }

  return {
    userId: authResult.userId,
    roles: authResult.roles ?? [],
    actorType: "agent",
    via: "session",
  }
}

export function mcpAuthRequiredMessage(): string {
  return "Unauthorized — admin session or valid NEOSAAS_MCP_TOKEN Bearer token required"
}
