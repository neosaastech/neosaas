"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { saveContentPage, getContentCategories } from "@/app/actions/pages"
import type { PayloadPageDoc, PayloadPageBlock, PayloadCategorySummary } from "@/lib/payload-bridge"
import { AVAILABLE_BLOCK_TYPES, BlockEditor } from "./block-editor"
import { BlockPreview } from "./block-preview"
import { TemplateVariablesHint } from "./template-variables-hint"

export function PageEditor({ page, onSaved }: { page: PayloadPageDoc | null; onSaved?: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState(page?.title ?? "")
  const [slug, setSlug] = useState(page?.slug ?? "")
  const [pageType, setPageType] = useState(page?.pageType ?? "")
  const [categoryId, setCategoryId] = useState<string>(page?.category ? String(page.category.id) : "")
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [metaTitle, setMetaTitle] = useState(page?.seo?.metaTitle ?? "")
  const [metaDescription, setMetaDescription] = useState(page?.seo?.metaDescription ?? "")
  const [layout, setLayout] = useState<PayloadPageBlock[]>(page?.layout ?? [])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getContentCategories().then((result) => {
      if (result.success) setCategories(result.data)
    })
  }, [])

  function addBlock(blockType: string) {
    setLayout([...layout, { blockType }])
  }

  function updateBlock(index: number, next: PayloadPageBlock) {
    setLayout(layout.map((b, i) => (i === index ? next : b)))
  }

  function removeBlock(index: number) {
    setLayout(layout.filter((_, i) => i !== index))
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const next = [...layout]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setLayout(next)
  }

  async function handleSave(status: "draft" | "published") {
    setIsSaving(true)
    try {
      // JSON round-trip strips `undefined` values from nested block objects
      // (e.g. a freshly-added repeatable item's not-yet-filled fields) —
      // cheap insurance against a Server Action serialization edge case,
      // since a client-side throw here previously had no catch at all: the
      // promise would reject, isSaving would stay stuck true forever, and
      // nothing — no toast, no server log — would ever show why.
      const sanitizedLayout = JSON.parse(JSON.stringify(layout))
      const result = await saveContentPage(page?.id ?? null, {
        title,
        slug,
        pageType: pageType || undefined,
        category: categoryId || null,
        layout: sanitizedLayout,
        seo: { metaTitle: metaTitle || undefined, metaDescription: metaDescription || undefined },
        _status: status,
      })
      if (result.success) {
        toast.success(status === "published" ? "Page publiée" : "Brouillon enregistré")
        if (onSaved) {
          onSaved()
        } else {
          router.push("/admin/pages")
          router.refresh()
        }
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error("handleSave threw before reaching the server:", error)
      toast.error(error instanceof Error ? error.message : "Une erreur inattendue est survenue")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Card shadow="flat">
          <CardHeader>
            <CardTitle>Informations de la page</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="page-title">Titre</Label>
              <Input id="page-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-slug">Slug</Label>
              <Input id="page-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Laisser vide pour la page d&apos;accueil (chemin &quot;/&quot;) — obligatoire pour toute autre page.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-type">Type de page</Label>
              <Select value={pageType || "landing"} onValueChange={setPageType}>
                <SelectTrigger id="page-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landing">Landing (marketing)</SelectItem>
                  <SelectItem value="article">Article (blog)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-category">Catégorie</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger id="page-category">
                  <SelectValue placeholder="Aucune catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune catégorie</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.path || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-title">Meta title (SEO)</Label>
              <Input id="meta-title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-description">Meta description (SEO)</Label>
              <Input
                id="meta-description"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Blocs</h3>
          <Select onValueChange={addBlock}>
            <SelectTrigger className="w-[200px]">
              <Plus className="h-3.5 w-3.5" />
              <SelectValue placeholder="Ajouter un bloc" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_BLOCK_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-4">
          {layout.map((block, index) => (
            <BlockEditor
              key={block.id ?? index}
              block={block}
              onChange={(next) => updateBlock(index, next)}
              onRemove={() => removeBlock(index)}
              onMoveUp={() => moveBlock(index, -1)}
              onMoveDown={() => moveBlock(index, 1)}
              canMoveUp={index > 0}
              canMoveDown={index < layout.length - 1}
            />
          ))}
        </div>

        {page && (
          <p className="text-xs text-muted-foreground">
            Chemin final : <span className="font-mono">{page.path || (slug ? `/${slug}` : "/")}</span>
            {page._status === "published" ? (
              <>
                {" — "}
                <a href={page.path} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Voir en ligne
                </a>
              </>
            ) : (
              " — Brouillon : n'apparaît pas encore sur le site tant que non publié."
            )}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" disabled={isSaving} onClick={() => handleSave("draft")}>
            Enregistrer le brouillon
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => handleSave("published")}>
            Publier
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <TemplateVariablesHint />
        <h3 className="text-sm font-medium">Aperçu en direct</h3>
        <div className="rounded-lg border bg-background p-6">
          {layout.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Ajoutez un bloc pour voir l&apos;aperçu.</p>
          ) : (
            <div className="flex flex-col">
              {layout.map((block, index) => (
                <BlockPreview key={block.id ?? index} block={block} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
