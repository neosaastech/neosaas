"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Layers,
  Newspaper,
  Pencil,
  Plus,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Search,
  Settings,
  CheckSquare,
  Eye,
  EyeOff,
  Download,
  ExternalLink,
  Trash,
  SlidersHorizontal,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  getContentPages,
  getContentPage,
  saveContentPage,
  removeContentPage,
  getContentArticles,
  getContentArticle,
  saveContentArticle,
  removeContentArticle,
  getContentCategories,
  saveCategory,
  removeCategory,
} from "@/app/actions/pages"
import type {
  PayloadPageSummary,
  PayloadPageDoc,
  PayloadBlogPostSummary,
  PayloadBlogPostDoc,
  PayloadCategorySummary,
  PayloadSyncStatus,
} from "@/lib/payload-bridge"
import { ContentSheet } from "./content/content-sheet"
import { PageEditor } from "./content/page-editor"
import { ArticleEditor } from "./content/article-editor"
import { MediaPickerField } from "./content/media-picker-field"
import { MediaGallery } from "./content/media-gallery"

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
// Fetched once per locale/type filter, then searched/sorted/paginated
// client-side — same pattern as /admin/products (products-page-client.tsx),
// which loads everything and never re-hits the server for a filter change.
// A boilerplate's page/article count stays in the tens, not the hundreds.
const FETCH_ALL_LIMIT = 200

/**
 * The content environment (2026-07-04, Charles): creating Pages or
 * Articles, nothing else — Internal Routes ACL moved to its own super_admin
 * screen (components/admin/internal-routes-settings.tsx). Both lists are
 * paginated via Payload's native REST pagination (not a client-side slice)
 * since a real site can reach dozens/hundreds of pages, not just the 2
 * that exist today.
 *
 * Editing (2026-07-05, Charles: "il vaut mieux privilégier un overlay
 * bottom qui s'affiche de bas vers le haut... si mobile alors apparition
 * right") happens in an in-place ContentSheet instead of navigating to a
 * separate /admin/content/pages/[id] route — one editing pattern for
 * Pages, Articles, and Categories alike, not one per content type.
 *
 * Table UX (2026-07-09, Charles: "la page content est pauvre... on doit
 * s'inspirer de la page produits") — brought over from /admin/products:
 * search, sortable headers, column visibility toggle, row selection with
 * bulk publish/unpublish/delete, and inline click-to-edit on the title.
 * Left out on purpose (not asked for, no clear content equivalent): CSV
 * import/export, the ID column, date-range filters.
 */
export function ContentHub() {
  return (
    // No TooltipProvider wraps the admin layout anywhere above this —
    // Radix's Tooltip.Root throws without one. The pre-existing sync-status
    // warning icon never hit this because its condition (syncStatus.ok ===
    // false) was never true in practice; the new per-row publish/unpublish
    // toggle below renders unconditionally and surfaced it immediately
    // (confirmed live 2026-07-09: `Tooltip must be used within TooltipProvider`).
    <TooltipProvider>
      <Tabs defaultValue="content" className="space-y-4">
        {/* Charles (2026-07-11): "ils méritent deux onglets qui bordent toute
            la page de la même manière que les onglets parameters pour l'UX
            design. on garde les repères iconographiques." Same structure as
            /admin/settings's TabsList (w-full grid + brand active state),
            icons kept unlike Parameters (which has none) — explicit choice. */}
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="content" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            <Layers className="h-3.5 w-3.5" /> Content
          </TabsTrigger>
          <TabsTrigger value="media" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            <ImageIcon className="h-3.5 w-3.5" /> Media
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <ContentPanel />
        </TabsContent>
        <TabsContent value="media">
          <MediaGallery />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  )
}

// Payload's Media collection is still the single source of truth (same as
// every other content type here) — MediaGallery (./content/media-gallery)
// now reads/writes it directly through payload-bridge.ts instead of only
// linking out to Payload's own admin (Charles, 2026-07-11: "j'ai un lien
// direct vers payload. c'est pas génial. je dois avoir les mêmes
// fonctionnalités de neosaas app depuis l'ui").

type SortDirection = "asc" | "desc"

function sortValue(value: unknown): string | number {
  if (value == null) return ""
  if (typeof value === "boolean") return value ? 1 : 0
  return typeof value === "number" ? value : String(value).toLowerCase()
}

function SortableHeader({
  field,
  sortField,
  sortDirection,
  onSort,
  className,
  children,
}: {
  field: string
  sortField: string | null
  sortDirection: SortDirection
  onSort: (field: string) => void
  className?: string
  children: React.ReactNode
}) {
  const isSorted = sortField === field
  return (
    <TableHead className={`cursor-pointer select-none hover:bg-muted/50 ${className ?? ""}`} onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        {isSorted && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
      </div>
    </TableHead>
  )
}

type ContentKind = "page" | "article" | "category"

interface ContentRow {
  kind: ContentKind
  id: string | number
  title: string
  path: string
  pageType?: string | null
  categoryName?: string | null
  // Categories have no publish/status concept — `status` stays "published"
  // so they always sort/filter as visible, but the table renders no
  // toggle for category rows (see the Status cell below).
  status: "draft" | "published"
  publishedAt?: string | null
  syncStatus?: PayloadSyncStatus | null
}

const CONTENT_TYPE_OPTIONS = [
  { value: "landing", label: "Page" },
  { value: "documentation", label: "Documentation (wiki)" },
  { value: "article", label: "Article (blog)" },
  { value: "category", label: "Category" },
]

/**
 * Unified list for Pages, Articles, and Categories (Charles, 2026-07-11:
 * "on supprime les onglets articles, catégorie devenus obsolètes...
 * dans l'édition on intègre tout les paramètres pour déterminer le type
 * de page (article, catégorie, documentation)"). The underlying Payload
 * collections and payload-bridge.ts calls are unchanged — pages stay
 * pages, articles stay blog-posts, categories stay categories, same sync
 * pipeline — this only merges the *presentation*: one table, one search,
 * one "New content" action with a type picker up front instead of three
 * separate "New page"/"New article"/"New category" buttons on three tabs.
 *
 * Categories are structurally simpler (name/slug/parent only, no publish
 * concept) so they get a small inline form in the same ContentSheet
 * instead of a full PageEditor/ArticleEditor — see CategoryEditorFields
 * below.
 *
 * Deliberately dropped versus the old tabbed version: the Author column
 * and the inline Index/Follow toggle (both Pages-only, both still
 * editable from within PageEditor's own SEO/Settings tabs, just not
 * inline-toggleable from this merged table) — keeping every column from
 * every previous table here would recreate the same sprawl this change
 * is meant to reduce.
 */
function ContentPanel() {
  const [allPages, setAllPages] = useState<PayloadPageSummary[]>([])
  const [allArticles, setAllArticles] = useState<PayloadBlogPostSummary[]>([])
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [locale, setLocale] = useState<string>("fr")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContentRow | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [creatingKind, setCreatingKind] = useState<ContentKind | null>(null)
  const [creatingPageType, setCreatingPageType] = useState<string>("landing")
  const [editingKind, setEditingKind] = useState<ContentKind | null>(null)
  const [editingPageDoc, setEditingPageDoc] = useState<PayloadPageDoc | null>(null)
  const [editingArticleDoc, setEditingArticleDoc] = useState<PayloadBlogPostDoc | null>(null)
  const [editingCategory, setEditingCategory] = useState<PayloadCategorySummary | null>(null)
  const [categoryFormName, setCategoryFormName] = useState("")
  const [categorySlug, setCategorySlug] = useState("")
  const [categoryParentId, setCategoryParentId] = useState("")
  const [categoryHeaderImage, setCategoryHeaderImage] = useState("")
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)

  // rowKey disambiguates a page and an article that happen to share a
  // numeric Payload id (two independent collections, two independent
  // sequences) — every selection/lookup below keys off this, never the
  // bare id.
  const rowKey = (kind: ContentKind, id: string | number) => `${kind}:${id}`

  useEffect(() => {
    getContentCategories(locale).then((result) => {
      if (result.success) setCategories(result.data)
    })
  }, [locale])

  async function load() {
    setIsLoading(true)
    const [pagesResult, articlesResult] = await Promise.all([
      getContentPages({ limit: FETCH_ALL_LIMIT, locale }),
      getContentArticles({ limit: FETCH_ALL_LIMIT, locale }),
    ])
    if (pagesResult.success) setAllPages(pagesResult.data.docs)
    if (articlesResult.success) setAllArticles(articlesResult.data.docs)
    setError(!pagesResult.success ? pagesResult.error : !articlesResult.success ? articlesResult.error : null)
    setIsLoading(false)
  }

  useEffect(() => {
    load()
    setSelectedIds(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, itemsPerPage, sortField, sortDirection, typeFilter])

  const categoryName = (id: string | number | null | undefined) =>
    categories.find((c) => String(c.id) === String(id))?.path

  const allRows: ContentRow[] = useMemo(() => {
    const pageRows: ContentRow[] = allPages.map((p) => ({
      kind: "page",
      id: p.id,
      title: p.title,
      path: p.path,
      pageType: p.pageType ?? "landing",
      categoryName: p.category?.name ?? null,
      status: p._status,
      publishedAt: p.publishedAt,
      syncStatus: p.syncStatus,
    }))
    const articleRows: ContentRow[] = allArticles.map((a) => ({
      kind: "article",
      id: a.id,
      title: a.title,
      path: `/blog/${a.slug}`,
      pageType: null,
      categoryName: categoryName(a.category),
      status: a._status,
      publishedAt: a.publishedAt,
      syncStatus: a.syncStatus,
    }))
    const categoryRows: ContentRow[] = categories.map((c) => ({
      kind: "category",
      id: c.id,
      title: c.name,
      path: c.path,
      pageType: null,
      categoryName: c.parent ? categoryName(c.parent) : null,
      status: "published",
      publishedAt: null,
      syncStatus: null,
    }))
    return [...pageRows, ...articleRows, ...categoryRows]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPages, allArticles, categories])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = allRows
    if (typeFilter !== "all") {
      list = list.filter((r) =>
        r.kind === "article" || r.kind === "category" ? r.kind === typeFilter : r.pageType === typeFilter,
      )
    }
    if (q) {
      list = list.filter((r) => r.title.toLowerCase().includes(q) || r.path.toLowerCase().includes(q))
    }
    if (sortField) {
      list = [...list].sort((a, b) => {
        const av = sortValue((a as unknown as Record<string, unknown>)[sortField])
        const bv = sortValue((b as unknown as Record<string, unknown>)[sortField])
        if (av < bv) return sortDirection === "asc" ? -1 : 1
        if (av > bv) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }
    return list
  }, [allRows, search, sortField, sortDirection, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  function toggleSelect(key: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const pageKeys = paginated.map((r) => rowKey(r.kind, r.id))
      const allSelected = pageKeys.every((k) => prev.has(k))
      const next = new Set(prev)
      if (allSelected) pageKeys.forEach((k) => next.delete(k))
      else pageKeys.forEach((k) => next.add(k))
      return next
    })
  }

  function openCreate(kind: ContentKind, pageType = "landing") {
    setCreatingKind(kind)
    setCreatingPageType(pageType)
    setEditingKind(kind)
    setEditingPageDoc(null)
    setEditingArticleDoc(null)
    if (kind === "category") {
      setEditingCategory(null)
      setCategoryFormName("")
      setCategorySlug("")
      setCategoryParentId("")
      setCategoryHeaderImage("")
    }
    setSheetOpen(true)
  }

  async function openEdit(row: ContentRow) {
    setSheetOpen(true)
    setEditingKind(row.kind)
    setCreatingKind(null)
    if (row.kind === "category") {
      const category = categories.find((c) => c.id === row.id) ?? null
      setEditingCategory(category)
      setCategoryFormName(category?.name ?? "")
      setCategorySlug(category?.slug ?? "")
      setCategoryParentId(category?.parent ? String(category.parent) : "")
      setCategoryHeaderImage(category?.headerImage ?? "")
      return
    }
    setIsLoadingDoc(true)
    if (row.kind === "page") {
      const result = await getContentPage(row.id, locale)
      if (result.success) setEditingPageDoc(result.data)
      else {
        toast.error(result.error)
        setSheetOpen(false)
      }
    } else {
      const result = await getContentArticle(row.id, locale)
      if (result.success) setEditingArticleDoc(result.data)
      else {
        toast.error(result.error)
        setSheetOpen(false)
      }
    }
    setIsLoadingDoc(false)
  }

  async function handleSaveCategory() {
    setIsSavingCategory(true)
    const result = await saveCategory(editingCategory?.id ?? null, {
      name: categoryFormName,
      slug: categorySlug,
      parent: categoryParentId || null,
      headerImage: categoryHeaderImage || null,
    })
    setIsSavingCategory(false)
    if (result.success) {
      toast.success(editingCategory ? "Category updated" : "Category created")
      setSheetOpen(false)
      load()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete(row: ContentRow) {
    const result =
      row.kind === "page"
        ? await removeContentPage(row.id)
        : row.kind === "article"
          ? await removeContentArticle(row.id)
          : await removeCategory(row.id)
    if (result.success) {
      toast.success(row.kind === "page" ? "Page deleted" : row.kind === "article" ? "Article deleted" : "Category deleted")
      if (row.kind === "page") setAllPages((prev) => prev.filter((p) => p.id !== row.id))
      else if (row.kind === "article") setAllArticles((prev) => prev.filter((a) => a.id !== row.id))
      else setCategories((prev) => prev.filter((c) => c.id !== row.id))
    } else {
      toast.error(result.error)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await handleDelete(deleteTarget)
    setDeleteTarget(null)
  }

  async function handleInlineTitleSave(row: ContentRow, title: string) {
    if (!title.trim() || title === row.title) {
      setEditingTitleId(null)
      return
    }
    const result =
      row.kind === "page"
        ? await saveContentPage(row.id, { title: title.trim() }, locale)
        : row.kind === "article"
          ? await saveContentArticle(row.id, { title: title.trim() }, locale)
          : await saveCategory(row.id, { name: title.trim(), slug: categories.find((c) => c.id === row.id)?.slug ?? "" })
    if (result.success) {
      toast.success("Title updated")
      setEditingTitleId(null)
      load()
    } else {
      toast.error(result.error)
    }
  }

  async function handleToggleStatus(row: ContentRow) {
    if (row.kind === "category") return // no publish concept for categories
    const next = row.status === "published" ? "draft" : "published"
    const result =
      row.kind === "page"
        ? await saveContentPage(row.id, { _status: next }, locale)
        : await saveContentArticle(row.id, { _status: next }, locale)
    if (result.success) {
      toast.success(next === "published" ? "Published" : "Unpublished")
      load()
    } else {
      toast.error(result.error)
    }
  }

  async function handleBulkStatus(status: "published" | "draft") {
    // Categories have no publish concept — silently excluded from bulk
    // publish/unpublish, still included in bulk delete below.
    const rows = paginated.filter((r) => selectedIds.has(rowKey(r.kind, r.id)) && r.kind !== "category")
    let ok = 0
    let fail = 0
    for (const row of rows) {
      const result =
        row.kind === "page"
          ? await saveContentPage(row.id, { _status: status }, locale)
          : await saveContentArticle(row.id, { _status: status }, locale)
      if (result.success) ok++
      else fail++
    }
    toast[fail > 0 ? "warning" : "success"](
      `${ok} item(s) ${status === "published" ? "published" : "unpublished"}${fail > 0 ? `, ${fail} failed` : ""}`,
    )
    setSelectedIds(new Set())
    load()
  }

  async function handleBulkDelete() {
    const rows = filtered.filter((r) => selectedIds.has(rowKey(r.kind, r.id)))
    if (!confirm(`Delete ${rows.length} item(s)? This action cannot be undone.`)) return
    let ok = 0
    let fail = 0
    for (const row of rows) {
      const result =
        row.kind === "page"
          ? await removeContentPage(row.id)
          : row.kind === "article"
            ? await removeContentArticle(row.id)
            : await removeCategory(row.id)
      if (result.success) ok++
      else fail++
    }
    toast[fail > 0 ? "warning" : "success"](`${ok} item(s) deleted${fail > 0 ? `, ${fail} failed` : ""}`)
    setSelectedIds(new Set())
    load()
  }

  function handleExportCSV() {
    if (filtered.length === 0) {
      toast.error("No content to export")
      return
    }
    const headers = ["Title", "Kind", "Type", "Path", "Category", "Status", "Published At"]
    const rows = filtered.map((r) => [
      `"${r.title.replace(/"/g, '""')}"`,
      r.kind,
      r.pageType ?? "",
      r.path,
      r.categoryName ?? "",
      r.status,
      r.publishedAt ?? "",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `content_export_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    toast.success(`${filtered.length} item(s) exported`)
  }

  const sheetTitle = creatingKind
    ? creatingKind === "article"
      ? "New article"
      : creatingKind === "category"
        ? "New category"
        : `New page${creatingPageType !== "landing" ? ` (${CONTENT_TYPE_OPTIONS.find((o) => o.value === creatingPageType)?.label})` : ""}`
    : editingKind === "page"
      ? editingPageDoc
        ? `Edit "${editingPageDoc.title}"`
        : "Edit page"
      : editingKind === "category"
        ? editingCategory
          ? `Edit "${editingCategory.name}"`
          : "Edit category"
        : editingArticleDoc
          ? `Edit "${editingArticleDoc.title}"`
          : "Edit article"

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand" />
            Content
          </CardTitle>
          <CardDescription>
            Pages, articles, and categories authored centrally, editable directly here — live from Payload. Note:
            /pricing and /legal stay hardcoded (business/payment logic) and can never be driven from here.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary">
                  <CheckSquare className="h-3.5 w-3.5" /> Actions ({selectedIds.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkStatus("published")}>
                  <Eye className="h-3.5 w-3.5" /> Publish
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatus("draft")}>
                  <EyeOff className="h-3.5 w-3.5" /> Unpublish
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleBulkDelete}>
                  <Trash className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> New content
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openCreate("page", "landing")}>
                <FileText className="h-3.5 w-3.5" /> Page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreate("page", "documentation")}>
                <Layers className="h-3.5 w-3.5" /> Documentation page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreate("article", "article")}>
                <Newspaper className="h-3.5 w-3.5" /> Article
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreate("category", "category")}>
                <FolderTree className="h-3.5 w-3.5" /> Category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error} — other content types below loaded fine and are still shown.</span>
          </div>
        )}
        <div className="mb-4 rounded-lg border bg-card p-3 sm:p-4">
          {/* Charles (2026-07-11): "ces sélecteurs méritent leur propre
              panneau plein écran... un bouton Filtres qui ouvre un plein
              écran/bottom sheet dédié" — below sm, the type/language/
              pagination Selects move into a dedicated bottom Sheet with
              full-width, labeled controls instead of three compact Selects
              stacked in the page flow. Same state, same options, sm: and up
              is untouched. */}
          <div className="flex gap-2 sm:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>
            <Button variant="outline" className="h-10 shrink-0" onClick={() => setMobileFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </div>
          <div className="hidden gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {CONTENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locale} onValueChange={(v) => setLocale(v)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {CONTENT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={locale} onValueChange={(v) => setLocale(v)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Items per page</Label>
                <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="h-12 w-full text-base" onClick={() => setMobileFiltersOpen(false)}>
                Apply
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44px]">
                  <Checkbox
                    checked={paginated.length > 0 && paginated.every((r) => selectedIds.has(rowKey(r.kind, r.id)))}
                    onCheckedChange={toggleSelectAllOnPage}
                    aria-label="Select all on page"
                  />
                </TableHead>
                <TableHead className="w-[56px]"></TableHead>
                <SortableHeader field="title" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="min-w-[150px]">
                  Title
                </SortableHeader>
                <TableHead className="min-w-[100px]">Type</TableHead>
                <SortableHeader field="path" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="min-w-[150px]">
                  Path
                </SortableHeader>
                <TableHead className="min-w-[120px]">Category</TableHead>
                <SortableHeader field="status" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="min-w-[100px]">
                  Status
                </SortableHeader>
                <SortableHeader field="publishedAt" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} className="min-w-[140px]">
                  Published
                </SortableHeader>
                <TableHead className="min-w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    Loading content...
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    {search ? "No results for this search." : "No content yet."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((r) => {
                  const key = rowKey(r.kind, r.id)
                  return (
                    <TableRow key={key} className="group">
                      <TableCell>
                        <Checkbox checked={selectedIds.has(key)} onCheckedChange={() => toggleSelect(key)} aria-label={`Select ${r.title}`} />
                      </TableCell>
                      <TableCell>
                        <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
                          {r.kind === "article" ? (
                            <Newspaper className="h-4 w-4 text-muted-foreground" />
                          ) : r.kind === "category" ? (
                            <FolderTree className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {editingTitleId === key ? (
                          <Input
                            autoFocus
                            defaultValue={r.title}
                            onBlur={(e) => handleInlineTitleSave(r, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur()
                              else if (e.key === "Escape") setEditingTitleId(null)
                            }}
                            className="h-8"
                          />
                        ) : (
                          <div onClick={() => setEditingTitleId(key)} className="cursor-pointer rounded px-2 py-1 hover:bg-muted/50">
                            {r.title}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {r.kind === "article" || r.kind === "category"
                            ? r.kind
                            : (CONTENT_TYPE_OPTIONS.find((o) => o.value === (r.pageType ?? "landing"))?.label ?? r.pageType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.status === "published" ? (
                          <a
                            href={`/${locale}${r.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {r.path}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground">{r.path}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Draft — not live at this address yet.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.categoryName ? (
                          <Badge variant="outline">{r.categoryName}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.kind === "category" ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(r)}
                              className={`h-8 w-8 transition-colors ${
                                r.status === "published"
                                  ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                  : "text-red-600 hover:text-red-700 hover:bg-red-50"
                              }`}
                              title={r.status === "published" ? "Published - Click to unpublish" : "Draft - Click to publish"}
                            >
                              {r.status === "published" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                            {r.syncStatus?.ok === false && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{r.syncStatus.message ?? "Sync to the site failed."}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.publishedAt
                          ? new Date(r.publishedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(r)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(r)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationControls page={currentPage} totalPages={totalPages} onChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
      </CardContent>

      <ContentSheet open={sheetOpen} onOpenChange={setSheetOpen} title={sheetTitle}>
        {isLoadingDoc ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : editingKind === "article" ? (
          <ArticleEditor
            article={editingArticleDoc}
            locale={locale}
            onSaved={() => {
              setSheetOpen(false)
              load()
            }}
          />
        ) : editingKind === "category" ? (
          <CategoryEditorFields
            categories={categories}
            editingId={editingCategory?.id}
            name={categoryFormName}
            slug={categorySlug}
            parentId={categoryParentId}
            headerImage={categoryHeaderImage}
            isSaving={isSavingCategory}
            onNameChange={setCategoryFormName}
            onSlugChange={setCategorySlug}
            onParentChange={setCategoryParentId}
            onHeaderImageChange={setCategoryHeaderImage}
            onSave={handleSaveCategory}
          />
        ) : (
          <PageEditor
            page={editingPageDoc}
            locale={locale}
            initialPageType={creatingPageType}
            onSaved={() => {
              setSheetOpen(false)
              load()
            }}
          />
        )}
      </ContentSheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this {deleteTarget?.kind === "article" ? "article" : deleteTarget?.kind === "category" ? "category" : "page"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> ({deleteTarget?.path}) will be permanently deleted
              {deleteTarget?.kind !== "category" && ", including its entire version history"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/**
 * Categories are structurally simpler than Pages/Articles (name/slug/parent
 * only, no layout blocks, no publish state) — a small inline form instead
 * of a full editor component, same fields the old dedicated Categories tab
 * used (categories-panel.tsx, now folded into ContentPanel above).
 */
function CategoryEditorFields({
  categories,
  editingId,
  name,
  slug,
  parentId,
  headerImage,
  isSaving,
  onNameChange,
  onSlugChange,
  onParentChange,
  onHeaderImageChange,
  onSave,
}: {
  categories: PayloadCategorySummary[]
  editingId: string | number | undefined
  name: string
  slug: string
  parentId: string
  headerImage: string
  isSaving: boolean
  onNameChange: (v: string) => void
  onSlugChange: (v: string) => void
  onParentChange: (v: string) => void
  onHeaderImageChange: (v: string) => void
  onSave: () => void
}) {
  return (
    <div className="flex flex-col gap-4 px-1">
      <div className="space-y-2">
        <Label htmlFor="category-name">Name</Label>
        <Input id="category-name" value={name} onChange={(e) => onNameChange(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category-slug">Slug</Label>
        <Input id="category-slug" value={slug} onChange={(e) => onSlugChange(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category-parent">Parent category</Label>
        <Select value={parentId || "none"} onValueChange={(v) => onParentChange(v === "none" ? "" : v)}>
          <SelectTrigger id="category-parent">
            <SelectValue placeholder="None (root category)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (root category)</SelectItem>
            {categories
              .filter((c) => String(c.id) !== String(editingId ?? ""))
              .map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.path || c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Header image</Label>
        {/* Charles (2026-07-11): metadata-only for now — no public category
            listing page exists yet to render a visual banner into. */}
        <MediaPickerField name="categoryHeaderImage" kind="image" value={headerImage} onChange={onHeaderImageChange} />
      </div>
      <Button onClick={onSave} disabled={isSaving || !name || !slug} className="mt-2">
        {editingId ? "Save" : "Create"}
      </Button>
    </div>
  )
}

function PaginationControls({
  page,
  totalPages,
  onChange,
  totalItems,
  itemsPerPage,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
}) {
  if (totalItems === 0) return null
  const from = (page - 1) * itemsPerPage + 1
  const to = Math.min(page * itemsPerPage, totalItems)
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        {from}–{to} sur {totalItems}
      </span>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
