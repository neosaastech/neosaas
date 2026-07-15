"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, Bot, Check, Copy, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createMcpToken, listMcpTokens, revokeMcpToken } from "@/app/actions/mcp-tokens"

interface McpToken {
  id: string
  name: string
  keyPrefix: string
  isActive: boolean
  lastUsedAt: string | Date | null
  createdAt: string | Date
}

/**
 * Charles (2026-07-15): le serveur MCP (/api/mcp) n'était protégé que par
 * NEOSAAS_MCP_TOKEN — une variable d'env comparée en `===`, sans interface
 * pour la générer/voir/révoquer. Cette carte branche enfin lib/apiKeys.ts
 * (hash SHA-256, déjà construit mais jamais utilisé nulle part) sur un vrai
 * flux admin, distinct des credentials tierces (Stripe/PayPal...) listées
 * plus haut sur cette page.
 */
export function McpTokensCard() {
  const [tokens, setTokens] = useState<McpToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTokenName, setNewTokenName] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function loadTokens() {
    setLoading(true)
    const result = await listMcpTokens()
    if (result.success) {
      setTokens(result.data)
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTokens()
  }, [])

  async function handleCreate() {
    if (!newTokenName.trim()) {
      toast.error("Name is required")
      return
    }
    setCreating(true)
    const result = await createMcpToken(newTokenName.trim())
    setCreating(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setRevealedKey(result.data.key)
    setNewTokenName("")
    await loadTokens()
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`Revoke MCP token "${name}"? Any agent using it will lose access immediately.`)) return
    const result = await revokeMcpToken(id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Token revoked")
    await loadTokens()
  }

  function copyKey() {
    if (!revealedKey) return
    navigator.clipboard.writeText(revealedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function closeCreateDialog() {
    setCreateDialogOpen(false)
    setRevealedKey(null)
    setCopied(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-brand" />
              MCP / Agent Access
            </CardTitle>
            <CardDescription>
              Bearer tokens for the MCP server (POST /api/mcp) — used by agents, not third-party services
            </CardDescription>
          </div>
          <Button size="sm" className="bg-brand hover:bg-[#B8691C]" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate token
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No MCP tokens yet. The server currently falls back to the legacy NEOSAAS_MCP_TOKEN env var if set.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  token.isActive ? "bg-card" : "bg-muted/50 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{token.name}</span>
                    <code className="text-xs text-muted-foreground">{token.keyPrefix}...</code>
                    {!token.isActive && (
                      <span className="text-xs text-destructive font-medium">Revoked</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created {new Date(token.createdAt).toLocaleDateString()}
                    {token.lastUsedAt ? ` · Last used ${new Date(token.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                  </p>
                </div>
                {token.isActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRevoke(token.id, token.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={createDialogOpen} onOpenChange={(open) => (open ? setCreateDialogOpen(true) : closeCreateDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{revealedKey ? "Token created" : "Generate MCP token"}</DialogTitle>
            <DialogDescription>
              {revealedKey
                ? "Copy this key now — it will never be shown again."
                : "Give it a name (e.g. the agent or environment using it)."}
            </DialogDescription>
          </DialogHeader>

          {revealedKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input readOnly value={revealedKey} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copyKey}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-destructive">
                This is the only time this key will be displayed. Store it securely.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="mcp-token-name">Token name</Label>
              <Input
                id="mcp-token-name"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="e.g. Claude Code agent"
              />
            </div>
          )}

          <DialogFooter>
            {revealedKey ? (
              <Button onClick={closeCreateDialog}>Done</Button>
            ) : (
              <Button onClick={handleCreate} disabled={creating} className="bg-brand hover:bg-[#B8691C]">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Generate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
