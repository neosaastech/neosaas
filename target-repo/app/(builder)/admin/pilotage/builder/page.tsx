"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import type { Data } from "@puckeditor/core"

const PuckEditor = dynamic(() => import("@/components/puck/puck-editor").then((m) => m.PuckEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Chargement de l&apos;éditeur…</div>
  ),
})
import { toast } from "sonner"
import { ArrowLeft, LayoutGrid, ArrowRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getPageLayers } from "@/app/actions/pages"
import { puckConfig } from "@/lib/puck/config"
import { puckDataToLayerRows, layerRowsToPuckData } from "@/lib/puck/bridge"
import { purgeBlockingOverlays } from "@/lib/dom/purge-blocking-overlays"
import { TemplateVariablesHint } from "@/components/admin/content/template-variables-hint"

const BUILDER_PAGES = [{ path: "/", name: "Accueil" }]

function BuilderChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b bg-background px-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Admin
          </Link>
        </Button>
        <span className="text-sm font-medium text-muted-foreground">Page Builder</span>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

function PagePicker() {
  return (
    <BuilderChrome>
      <div className="container max-w-3xl py-12">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LayoutGrid className="h-6 w-6" /> Éditeur visuel — choisir une page
        </h1>
        <p className="mb-8 text-muted-foreground">
          Composez la page avec les blocs réutilisables. La publication écrit dans{" "}
          <code>page_layers</code>.
        </p>
        <div className="mb-6 max-w-xl">
          <TemplateVariablesHint compact />
        </div>
        <div className="space-y-3">
          {BUILDER_PAGES.map((p) => (
            <Link key={p.path} href={`/admin/pilotage/builder?path=${encodeURIComponent(p.path)}`}>
              <Card className="transition-colors hover:border-primary">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">{p.path}</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </BuilderChrome>
  )
}

function BuilderInner() {
  const searchParams = useSearchParams()
  const pagePath = searchParams.get("path")
  const locale = searchParams.get("locale") || "fr"
  const [initialData, setInitialData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(!!pagePath)

  useEffect(() => {
    purgeBlockingOverlays()
    return () => purgeBlockingOverlays({ force: true })
  }, [])

  useEffect(() => {
    if (!pagePath) return
    setLoading(true)
    setInitialData(null)
    getPageLayers(pagePath, locale)
      .then((result) => {
        if (result.success) {
          setInitialData(layerRowsToPuckData(result.data))
        } else {
          toast.error(result.error)
          setInitialData({ content: [], root: { props: {} } } as Data)
        }
      })
      .finally(() => setLoading(false))
  }, [pagePath, locale])

  async function handlePublish(data: Data) {
    if (!pagePath) return
    const layers = puckDataToLayerRows(data)
    const res = await fetch("/api/admin/pilot/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actions: [{ action: "set_layers", payload: { pagePath, layers } }],
        dryRun: false,
      }),
    })
    const result = await res.json()
    if (!res.ok || result.results?.[0]?.status === "error") {
      toast.error(result.results?.[0]?.error || result.error || "Échec de la publication")
      return
    }
    toast.success(`Page "${pagePath}" publiée`)
    purgeBlockingOverlays()
  }

  if (!pagePath) return <PagePicker />

  if (loading || !initialData) {
    return (
      <BuilderChrome>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Chargement des blocs…
        </div>
      </BuilderChrome>
    )
  }

  return (
    <BuilderChrome>
      <div className="h-full min-h-0">
        <PuckEditor
          key={`${pagePath}-${locale}`}
          config={puckConfig}
          data={initialData}
          onPublish={handlePublish}
        />
      </div>
    </BuilderChrome>
  )
}

export default function BuilderPage() {
  return (
    <Suspense fallback={null}>
      <BuilderInner />
    </Suspense>
  )
}
