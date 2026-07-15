'use server'

import { getCurrentUser } from '@/lib/auth'
import { createApiKey, listApiKeysByPermission, revokeApiKeyById } from '@/lib/apiKeys'

const MCP_PERMISSION = 'mcp'

async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ['admin', 'super_admin'].includes(r))) {
    throw new Error('Forbidden — admin access required')
  }
  return currentUser
}

export async function createMcpToken(name: string) {
  try {
    const currentUser = await requireAdmin()
    const created = await createApiKey({
      userId: currentUser.userId,
      name,
      permissions: [MCP_PERMISSION],
    })
    return { success: true as const, data: created }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Failed to create token' }
  }
}

export async function listMcpTokens() {
  try {
    await requireAdmin()
    const tokens = await listApiKeysByPermission(MCP_PERMISSION)
    return { success: true as const, data: tokens }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Failed to list tokens' }
  }
}

export async function revokeMcpToken(id: string) {
  try {
    await requireAdmin()
    const tokens = await listApiKeysByPermission(MCP_PERMISSION)
    if (!tokens.some((t) => t.id === id)) {
      throw new Error('Token not found or not an MCP token')
    }
    await revokeApiKeyById(id)
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Failed to revoke token' }
  }
}
