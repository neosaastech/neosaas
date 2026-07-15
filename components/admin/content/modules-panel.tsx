"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, LayoutTemplate, Search } from "lucide-react"
import { toast } from "sonner"
import { getContentModules, getContentModule, removeContentModule, saveContentModule } from "@/app/actions/header-footer"
import type { PayloadModuleSummary, PayloadModuleDoc, ModuleWriteInput } from "@/lib/payload-bridge"
import { ContentSheet } from "./content-sheet"
import { ModuleEditor } from "./module-editor"
import { ContentImportExportBar } from "./content-import-export-bar"
import { downloadJson, downloadCsv, scopeRefToId } from "@/lib/admin/content-io"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function scopeLabel(row: { scopeType: string; scopePage?: unknown; scopeCategory?: unknown; scopePageType?: string | null }): string {
  if (row.scopeType === "page") {
    const p = row.scopePage as { title?: string; path?: string } | undefined
    return `Page: ${p?.title ?? p?.path ?? "?"}`
  }
  if (row.scopeType === "category") {
    const c = row.scopeCategory as { name?: string } | undefined
    return `Category: ${c?.name ?? "?"}`
  }
  if (row.scopeType === "pageType") return `Page type: ${row.scopePageType ?? "?"}`
  return "Default (whole site)"
}

/**
 * Same "content table" visual norm as HeaderFooterPanel/ContentPanel
 * (Charles, 2026-07-14: "on doit retrouver la norme du tableau de contenu
 * comme dans page") — Card/Table wrapper, search box, row actions. Modules
 * aren't paginated content like Pages/Articles either (typically a handful
 * per tenant, one per scope×anchorKey), so this stays the lighter panel
 * pattern Header/Footer already established rather than ContentHub's full
 * sortable/resizable table.
 */
export function ModulesPanel() {
  const [modules, setModules] = useState<PayloadModuleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editingModule, setEditingModule] = useState<PayloadModuleDoc | undefined>(undefined)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string | number; label: string } | null>(null)
  // Charles (2026-07-15): Modules sont maintenant localisés (payload-cms),
  // même sélecteur que Header/Footer/Pages.
  const [locale, setLocale] = useState<string>("fr")

  const reload = useCallback(async () => {
    setLoading(true)
    const result = await getContentModules(locale)
    if (result.success) setModules(result.data)
    else toast.error(result.error)
    setLoading(false)
  }, [locale])

  useEffect(() => {
    setLoading(true)
    getContentModules(locale).then((result) => {
      if (result.success) setModules(result.data)
      else toast.error(result.error)
      setLoading(false)
    })
  }, [locale])

  function openCreate() {
    setEditingModule(undefined)
    setSheetOpen(true)
  }

  async function openEdit(id: string | number) {
    const result = await getContentModule(id, locale)
    if (!result.success) return toast.error(result.error)
    setEditingModule(result.data)
    setSheetOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const result = await removeContentModule(deleteTarget.id)
    if (result.success) {
      toast.success("Module deleted")
      reload()
    } else {
      toast.error(result.error)
    }
    setDeleteTarget(null)
  }

  function onSaved() {
    setSheetOpen(false)
    reload()
  }

  const filteredRows = useMemo(() => {
    if (!search.trim()) return modules
    const q = search.trim().toLowerCase()
    return modules.filter((row) => row.anchorKey.toLowerCase().includes(q) || scopeLabel(row).toLowerCase().includes(q))
  }, [modules, search])

  async function handleExportJson() {
    if (filteredRows.length === 0) { toast.error("No module to export"); return }
    const docs = await Promise.all(filteredRows.map((row) => getContentModule(row.id, locale)))
    const failed = docs.filter((d) => !d.success).length
    downloadJson("modules_export", docs.filter((d) => d.success).map((d) => (d as { data: PayloadModuleDoc }).data))
    toast[failed > 0 ? "warning" : "success"](`${docs.length - failed} module(s) exported${failed > 0 ? `, ${failed} failed` : ""}`)
  }

  function handleExportCsv() {
    if (filteredRows.length === 0) return toast.error("No module to export")
    downloadCsv(
      "modules_export",
      ["ID", "Anchor Key", "Scope", "Updated At"],
      filteredRows.map((row) => [row.id, row.anchorKey, scopeLabel(row), row.updatedAt]),
    )
    toast.success(`${filteredRows.length} module(s) exported`)
  }

  // JSON only — a module's real content (anchorKey, content blocks) isn't
  // simple flat fields a CSV row can safely round-trip, unlike Pages'
  // title/status (see ContentHub's CSV import).
  async function handleImportFile(file: File) {
    let docs: (Partial<PayloadModuleDoc> & { id?: string | number })[]
    try {
      docs = JSON.parse(await file.text())
      if (!Array.isArray(docs)) throw new Error("Expected a JSON array")
    } catch (error) {
      toast.error(error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON")
      return
    }

    let ok = 0
    let fail = 0
    for (const doc of docs) {
      const input: ModuleWriteInput = {
        scopeType: doc.scopeType ?? "default",
        scopePage: scopeRefToId(doc.scopePage),
        scopeCategory: scopeRefToId(doc.scopeCategory),
        scopePageType: doc.scopePageType ?? null,
        anchorKey: doc.anchorKey ?? "",
        content: doc.content ?? [],
      }
      const result = await saveContentModule(doc.id ?? null, input, locale)
      if (result.success) ok++
      else fail++
    }
    toast[fail > 0 ? "warning" : "success"](`${ok} module(s) imported${fail > 0 ? `, ${fail} failed` : ""}`)
    reload()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-brand" />
            Modules
          </CardTitle>
          <CardDescription>
            Reusable content injected at a specific position inside a page — targets a &quot;Module anchor&quot; block by its key.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ContentImportExportBar
            onExportJson={handleExportJson}
            onExportCsv={handleExportCsv}
            onImportFile={handleImportFile}
            importAccept=".json"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add a module
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by anchor or scope..."
              className="pl-8"
            />
          </div>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger className="h-10 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">🇫🇷 Français</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Below md, a table forces horizontal scrolling to see the Actions
            column — Charles (2026-07-15): "tout doit être visible" on
            mobile. A stacked card list replaces it there; the table stays
            for md: and up where it fits without scrolling. */}
        <div className="space-y-2 md:hidden">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading modules...</p>
          ) : filteredRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? "No results for this search." : "No module yet."}
            </p>
          ) : (
            filteredRows.map((row) => (
              <div key={row.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-mono text-sm">{row.anchorKey}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: row.id, label: `${row.anchorKey} (${scopeLabel(row)})` })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{scopeLabel(row)}</span>
                  <span>· Updated {new Date(row.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden rounded-md border overflow-x-auto md:block">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Anchor key</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading modules...
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {search ? "No results for this search." : "No module yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell className="font-mono text-sm">{row.anchorKey}</TableCell>
                    <TableCell>{scopeLabel(row)}</TableCell>
                    <TableCell>{new Date(row.updatedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: row.id, label: `${row.anchorKey} (${scopeLabel(row)})` })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ContentSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Module">
        <ModuleEditor module={editingModule} locale={locale} onSaved={onSaved} onCancel={() => setSheetOpen(false)} />
      </ContentSheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this module?</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.label} — this action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
