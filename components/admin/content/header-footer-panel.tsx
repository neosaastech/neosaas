"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, PanelTop, PanelBottom, Search } from "lucide-react"
import { toast } from "sonner"
import {
  getContentHeaders,
  getContentHeader,
  removeContentHeader,
  saveContentHeader,
  getContentFooters,
  getContentFooter,
  removeContentFooter,
  saveContentFooter,
} from "@/app/actions/header-footer"
import type {
  PayloadHeaderSummary,
  PayloadHeaderDoc,
  HeaderWriteInput,
  PayloadFooterSummary,
  PayloadFooterDoc,
  FooterWriteInput,
} from "@/lib/payload-bridge"
import { ContentSheet } from "./content-sheet"
import { HeaderEditor } from "./header-editor"
import { FooterEditor } from "./footer-editor"
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
 * Header/Footer aren't paginated content like Pages/Articles (see
 * ContentPanel in pages-settings.tsx) — no pagination — so this stays a
 * separate, lighter panel rather than a third `kind` in ContentHub's
 * table. Visual style (Card/CardHeader/Table wrapper) and the search box
 * are deliberately aligned with ContentPanel/MediaGallery though (Charles,
 * 2026-07-14: "les tableaux récapitulatifs doivent être similaires") —
 * search matters more here now than when this panel was first built,
 * since every Page/Category/PageType can have its own scoped doc, not
 * just a single tenant-wide Default.
 *
 * Header (not Footer) gained a draft/publish workflow (Charles, 2026-07-14:
 * "une publication comme sur l'admin des pages") — the Status column below
 * only applies to Header, Footer has no `_status` field at all.
 */
export function HeaderFooterPanel({ type }: { type: "header" | "footer" }) {
  const [headers, setHeaders] = useState<PayloadHeaderSummary[]>([])
  const [footers, setFooters] = useState<PayloadFooterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  // Charles (2026-07-15): "comment pourrais-je avoir un footer en anglais
  // alors qu'on est dans une page fr ?" — Header/Footer sont maintenant
  // localisés (payload-cms), même sélecteur que pages-settings.tsx.
  const [locale, setLocale] = useState<string>("fr")
  const [editingHeader, setEditingHeader] = useState<PayloadHeaderDoc | undefined>(undefined)
  const [editingFooter, setEditingFooter] = useState<PayloadFooterDoc | undefined>(undefined)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string | number; label: string } | null>(null)

  // Not called from the effect below by reference — a named async callback
  // referenced by a useEffect gets its whole body (including the setState
  // calls past the first await) treated as "synchronous within the effect"
  // by this repo's react-compiler lint rule; only used by the post-save/
  // post-delete handlers, which aren't inside an effect.
  const reload = useCallback(async () => {
    setLoading(true)
    if (type === "header") {
      const result = await getContentHeaders(locale)
      if (result.success) setHeaders(result.data)
      else toast.error(result.error)
    } else {
      const result = await getContentFooters(locale)
      if (result.success) setFooters(result.data)
      else toast.error(result.error)
    }
    setLoading(false)
  }, [type, locale])

  useEffect(() => {
    setLoading(true)
    if (type === "header") {
      getContentHeaders(locale).then((result) => {
        if (result.success) setHeaders(result.data)
        else toast.error(result.error)
        setLoading(false)
      })
    } else {
      getContentFooters(locale).then((result) => {
        if (result.success) setFooters(result.data)
        else toast.error(result.error)
        setLoading(false)
      })
    }
  }, [type, locale])

  async function openCreate() {
    if (type === "header") setEditingHeader(undefined)
    else setEditingFooter(undefined)
    setSheetOpen(true)
  }

  async function openEdit(id: string | number) {
    if (type === "header") {
      const result = await getContentHeader(id, locale)
      if (!result.success) return toast.error(result.error)
      setEditingHeader(result.data)
    } else {
      const result = await getContentFooter(id, locale)
      if (!result.success) return toast.error(result.error)
      setEditingFooter(result.data)
    }
    setSheetOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const result = type === "header" ? await removeContentHeader(deleteTarget.id) : await removeContentFooter(deleteTarget.id)
    if (result.success) {
      toast.success(type === "header" ? "Header deleted" : "Footer deleted")
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

  const rows = type === "header" ? headers : footers
  const label = type === "header" ? "Header" : "Footer"
  const Icon = type === "header" ? PanelTop : PanelBottom

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter((row) => scopeLabel(row).toLowerCase().includes(q))
  }, [rows, search])

  const showStatusColumn = type === "header"
  const columnCount = showStatusColumn ? 4 : 3

  async function handleExportJson() {
    if (filteredRows.length === 0) { toast.error(`No ${label.toLowerCase()} to export`); return }
    const docs = await Promise.all(
      filteredRows.map((row) => (type === "header" ? getContentHeader(row.id, locale) : getContentFooter(row.id, locale))),
    )
    const failed = docs.filter((d) => !d.success).length
    downloadJson(
      `${type}s_export`,
      docs.filter((d) => d.success).map((d) => (d as { data: PayloadHeaderDoc | PayloadFooterDoc }).data),
    )
    toast[failed > 0 ? "warning" : "success"](
      `${docs.length - failed} ${label.toLowerCase()}(s) exported${failed > 0 ? `, ${failed} failed` : ""}`,
    )
  }

  function handleExportCsv() {
    if (filteredRows.length === 0) return toast.error(`No ${label.toLowerCase()} to export`)
    const headers = showStatusColumn ? ["ID", "Scope", "Status", "Updated At"] : ["ID", "Scope", "Updated At"]
    const rows = filteredRows.map((row) =>
      showStatusColumn
        ? [row.id, scopeLabel(row), "_status" in row && row._status === "published" ? "published" : "draft", row.updatedAt]
        : [row.id, scopeLabel(row), row.updatedAt],
    )
    downloadCsv(`${type}s_export`, headers, rows)
    toast.success(`${filteredRows.length} ${label.toLowerCase()}(s) exported`)
  }

  // JSON only — navItems/cta (header) and modules blocks (footer) aren't
  // simple flat fields a CSV row can safely round-trip.
  async function handleImportFile(file: File) {
    let docs: (Partial<PayloadHeaderDoc & PayloadFooterDoc> & { id?: string | number })[]
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
      const result =
        type === "header"
          ? await saveContentHeader(
              doc.id ?? null,
              {
                scopeType: doc.scopeType ?? "default",
                scopePage: scopeRefToId(doc.scopePage),
                scopeCategory: scopeRefToId(doc.scopeCategory),
                scopePageType: doc.scopePageType ?? null,
                navItems: doc.navItems ?? [],
                cta: doc.cta ?? null,
                brandDisplay: doc.brandDisplay,
                logo: doc.logo ?? null,
                showThemeSwitch: doc.showThemeSwitch,
                showLocaleSwitcher: doc.showLocaleSwitcher,
                showSocialLinks: doc.showSocialLinks,
                showAuthButtons: doc.showAuthButtons,
                socialLinks: doc.socialLinks,
                _status: doc._status ?? "draft",
              } satisfies HeaderWriteInput,
              locale,
            )
          : await saveContentFooter(
              doc.id ?? null,
              {
                scopeType: doc.scopeType ?? "default",
                scopePage: scopeRefToId(doc.scopePage),
                scopeCategory: scopeRefToId(doc.scopeCategory),
                scopePageType: doc.scopePageType ?? null,
                modules: doc.modules ?? [],
                brandDisplay: doc.brandDisplay,
                logo: doc.logo ?? null,
                copyrightText: doc.copyrightText ?? null,
                tagline: doc.tagline ?? null,
              } satisfies FooterWriteInput,
              locale,
            )
      if (result.success) ok++
      else fail++
    }
    toast[fail > 0 ? "warning" : "success"](`${ok} ${label.toLowerCase()}(s) imported${fail > 0 ? `, ${fail} failed` : ""}`)
    reload()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-brand" />
            {label}s
          </CardTitle>
          <CardDescription>
            A &quot;Default&quot; document for the whole site, or one targeted at a specific page/category/page type.
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
            <Plus className="h-4 w-4 mr-1" /> Add a {label.toLowerCase()}
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
              placeholder="Search by scope..."
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
            <p className="py-8 text-center text-sm text-muted-foreground">Loading {label.toLowerCase()}s...</p>
          ) : filteredRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? "No results for this search." : `No ${label.toLowerCase()} yet.`}
            </p>
          ) : (
            filteredRows.map((row) => (
              <div key={row.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">{scopeLabel(row)}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: row.id, label: scopeLabel(row) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {showStatusColumn && (
                    <Badge variant={"_status" in row && row._status === "published" ? "default" : "outline"}>
                      {"_status" in row && row._status === "published" ? "Published" : "Draft"}
                    </Badge>
                  )}
                  <span>Updated {new Date(row.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden rounded-md border overflow-x-auto md:block">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                {showStatusColumn && <TableHead className="w-[110px]">Status</TableHead>}
                <TableHead>Updated</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center">
                    Loading {label.toLowerCase()}s...
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                    {search ? "No results for this search." : `No ${label.toLowerCase()} yet.`}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell>{scopeLabel(row)}</TableCell>
                    {showStatusColumn && (
                      <TableCell>
                        <Badge variant={"_status" in row && row._status === "published" ? "default" : "outline"}>
                          {"_status" in row && row._status === "published" ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>{new Date(row.updatedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: row.id, label: scopeLabel(row) })}>
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

      <ContentSheet open={sheetOpen} onOpenChange={setSheetOpen} title={type === "header" ? "Header" : "Footer"}>
        {type === "header" ? (
          <HeaderEditor header={editingHeader} locale={locale} onSaved={onSaved} onCancel={() => setSheetOpen(false)} />
        ) : (
          <FooterEditor footer={editingFooter} locale={locale} onSaved={onSaved} onCancel={() => setSheetOpen(false)} />
        )}
      </ContentSheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {label.toLowerCase()}?</AlertDialogTitle>
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
