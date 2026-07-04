"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getContentCategories, saveCategory, removeCategory } from "@/app/actions/pages"
import type { PayloadCategorySummary } from "@/lib/payload-bridge"
import { ContentSheet } from "./content-sheet"

export function CategoriesPanel() {
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<PayloadCategorySummary | null>(null)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [parentId, setParentId] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  async function load() {
    setIsLoading(true)
    const result = await getContentCategories()
    if (result.success) setCategories(result.data)
    setIsLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditing(null)
    setName("")
    setSlug("")
    setParentId("")
    setSheetOpen(true)
  }

  function openEdit(category: PayloadCategorySummary) {
    setEditing(category)
    setName(category.name)
    setSlug(category.slug)
    setParentId(category.parent ? String(category.parent) : "")
    setSheetOpen(true)
  }

  async function handleSave() {
    setIsSaving(true)
    const result = await saveCategory(editing?.id ?? null, {
      name,
      slug,
      parent: parentId || null,
    })
    setIsSaving(false)
    if (result.success) {
      toast.success(editing ? "Catégorie mise à jour" : "Catégorie créée")
      setSheetOpen(false)
      load()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete(category: PayloadCategorySummary) {
    const result = await removeCategory(category.id)
    if (result.success) {
      toast.success("Catégorie supprimée")
      load()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-brand" />
            Catégories
          </CardTitle>
          <CardDescription>Taxonomie partagée entre Pages et Articles — organiser le contenu.</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New category
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead className="min-w-[150px]">Path</TableHead>
                <TableHead className="min-w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Loading categories...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No categories yet.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.path}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(c)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Edit <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                        >
                          Delete <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ContentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? `Modifier "${editing.name}"` : "Nouvelle catégorie"}
      >
        <div className="flex flex-col gap-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nom</Label>
            <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-slug">Slug</Label>
            <Input id="category-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-parent">Catégorie parente</Label>
            <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
              <SelectTrigger id="category-parent">
                <SelectValue placeholder="Aucune (catégorie racine)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune (catégorie racine)</SelectItem>
                {categories
                  .filter((c) => c.id !== editing?.id)
                  .map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.path || c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={isSaving || !name || !slug} className="mt-2">
            {editing ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </ContentSheet>
    </Card>
  )
}
