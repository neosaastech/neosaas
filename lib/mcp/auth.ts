import { NextRequest } from "next/server"
import { verifyAdminAuth } from "@/lib/auth/admin-auth"
import { verifyApiKey } from "@/lib/apiKeys"

export interface McpAuthContext {
  userId: string
  roles: string[]
  actorType: "human" | "agent"
  via: "session" | "token"
}

// Legacy bootstrap fallback — a static env var, plain `===` compare, no admin
// UI to generate/view/revoke it. Kept so an already-configured Vercel
// deployment doesn't break; the real path is now a DB-backed key managed
// from /admin/api (see app/actions/mcp-tokens.ts), checked first below.
function getConfiguredMcpToken(): string | undefined {
  return process.env.NEOSAAS_MCP_TOKEN?.trim() || undefined
}

function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  return header.slice("Bearer ".length).trim() || null
}

function isLegacyMcpTokenValid(request: NextRequest): boolean {
  const configured = getConfiguredMcpToken()
  if (!configured) return false
  const provided = extractBearerToken(request)
  return Boolean(provided && provided === configured)
}

export async function isMcpTokenValid(request: NextRequest): Promise<boolean> {
  const provided = extractBearerToken(request)
  if (provided) {
    const result = await verifyApiKey(provided)
    if (result.valid && result.key?.permissions?.includes("mcp")) {
      return true
    }
  }
  return isLegacyMcpTokenValid(request)
}

export async function verifyMcpAuth(request: NextRequest): Promise<McpAuthContext | null> {
  if (await isMcpTokenValid(request)) {
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
