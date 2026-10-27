import { NextRequest } from "next/server"
import { verifyAdminAuth } from "@/lib/auth/admin-auth"
import { verifyApiKey } from "@/lib/apiKeys"
import { getUserRoles } from "@/lib/auth/server"

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

// 2026-08-29 — NEO-610 (audit ACL reader/writer) : jusqu'ici TOUT chemin d'auth qui réussissait
// (token DB-backed, token legacy statique, ou session admin) renvoyait `roles: ["super_admin"]`
// en dur, quel que soit le porteur réel du credential -- `McpAuthContext.roles` existait mais
// n'était vérifié nulle part dans callTool(). Résultat : le seul token partagé
// NEOSAAS_MCP_TOKEN donnait un accès total à tous les outils, y compris l'écriture. Résout
// désormais le VRAI rôle du porteur -- une clé API DB-backed hérite des rôles de son
// propriétaire (userApiKeys.userId), la session hérite des siens ; seul le token legacy statique
// (secret partagé, non scopable par nature) reste borné à "writer" par défaut plutôt que
// "super_admin" -- moindre privilège en attendant sa dépréciation complète (voir doc MCP,
// "legacy bootstrap fallback").
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
  const provided = extractBearerToken(request)
  if (provided) {
    const result = await verifyApiKey(provided)
    if (result.valid && result.key?.permissions?.includes("mcp")) {
      const roles = await getUserRoles(result.key.userId)
      return {
        userId: result.key.userId,
        roles,
        actorType: "agent",
        via: "token",
      }
    }
  }

  if (isLegacyMcpTokenValid(request)) {
    return {
      userId: "mcp-agent-legacy",
      roles: ["writer"],
      actorType: "agent",
      via: "token",
    }
  }

  const sessionCookie = request.cookies.get("auth-token")?.value
  if (!sessionCookie) {
    return null
  }

  const authResult = await verifyAdminAuth(request)
  if (!authResult.isAuthenticated || !authResult.userId) {
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
