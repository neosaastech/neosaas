"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"
import { Loader2, Terminal, History, Shield, LayoutGrid } from "lucide-react"
import { useRequireAdmin } from "@/lib/hooks/use-require-admin"

const EXAMPLE_PAYLOAD = JSON.stringify(
  {
    actions: [
      {
        action: "create_page",
        payload: { path: "/promo-ete", name: "Promo Été", access: "public", group: "Public" },
      },
      {
        action: "set_layers",
        payload: {
          pagePath: "/promo-ete",
          layers: [
            { layerType: "hero", position: 0, props: { title: "-20% cet été", ctaLabel: "En profiter", ctaHref: "/pricing" } },
          ],
        },
      },
    ],
  },
  null,
  2
)

interface ActionResult {
  action: string
  status: "applied" | "would_apply" | "error"
  error?: string
}

interface PilotLog {
  id: string
  actorType: string
  result: string
  dryRun: boolean
  createdAt: string
  errors: ActionResult[] | null
}

export default function PilotagePage() {
  const { isChecking, isAdmin } = useRequireAdmin()
  const [payload, setPayload] = useState(EXAMPLE_PAYLOAD)
  const [dryRun, setDryRun] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<ActionResult[] | null>(null)
  const [logs, setLogs] = useState<PilotLog[]>([])

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/admin/pilot/logs")
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch {
      // history is a nice-to-have, don't block the page on it
    }
  }

  useEffect(() => {
    if (isAdmin) loadLogs()
  }, [isAdmin])

  const handleSubmit = async () => {
    let body: unknown
    try {
      body = JSON.parse(payload)
    } catch {
      toast.error("JSON invalide")
      return
    }

    setSubmitting(true)
    setResults(null)
    try {
      const res = await fetch("/api/admin/pilot/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(body as object), dryRun }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Échec de la requête")
        return
      }
      setResults(data.results)
      toast.success(dryRun ? "Validation terminée" : "Actions appliquées")
      if (!dryRun) loadLogs()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setSubmitting(false)
    }
  }

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Shield className="h-12 w-12 animate-pulse text-brand" />
      </div>
    )
  }
  if (!isAdmin) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Terminal className="h-7 w-7" />
            Pilotage JSON
          </h1>
          <p className="text-muted-foreground mt-1">
            Pilote une instance NeoSaaS de façon déclarative — création de pages, composition de calques,
            config plateforme — sans passer par l&apos;UI admin. Actions supportées : <code>create_page</code>,{" "}
            <code>set_layers</code>, <code>set_platform_config</code>.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/pilotage/builder">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Éditeur visuel (Puck)
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payload</CardTitle>
          <CardDescription>Colle un JSON <code>PilotRequest</code> — active dry-run pour valider sans écrire.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={dryRun} onCheckedChange={setDryRun} />
              <Label>Dry run (valide sans appliquer)</Label>
            </div>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {dryRun ? "Valider" : "Appliquer"}
            </Button>
          </div>

          {results && (
            <div className="space-y-2 pt-2 border-t">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant={r.status === "error" ? "destructive" : "outline-solid"}>{r.status}</Badge>
                  <code>{r.action}</code>
                  {r.error && <span className="text-destructive text-xs">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique
          </CardTitle>
          <CardDescription>20 dernières applications (POST /api/admin/pilot/apply)</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune application enregistrée pour l&apos;instant.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        log.result === "success" ? "outline-solid" : log.result === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {log.result}
                    </Badge>
                    {log.dryRun && <Badge variant="secondary">dry-run</Badge>}
                    <span className="text-muted-foreground">{log.actorType}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
