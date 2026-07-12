"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
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
import { useEffect, useMemo, useRef, useState } from "react"
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
import { RichTextEditor } from "./content/rich-text-editor"

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
  width,
  onResizeStart,
}: {
  field: string
  sortField: string | null
  sortDirection: SortDirection
  onSort: (field: string) => void
  className?: string
  children: React.ReactNode
  width?: number
  onResizeStart?: (e: React.MouseEvent) => void
}) {
  const isSorted = sortField === field
  return (
    <TableHead
      className={`relative cursor-pointer select-none hover:bg-muted/50 ${className ?? ""}`}
      style={width ? { width, minWidth: width, maxWidth: width } : undefined}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1 overflow-hidden">
        {children}
        {isSorted && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
      </div>
      {onResizeStart && <ColumnResizeHandle onMouseDown={onResizeStart} />}
    </TableHead>
  )
}

/** Plain (non-sortable) resizable header — Type/Category/Parent columns. */
function ResizableHead({
  className,
  children,
  width,
  onResizeStart,
}: {
  className?: string
  children?: React.ReactNode
  width?: number
  onResizeStart?: (e: React.MouseEvent) => void
}) {
  return (
    <TableHead className={`relative ${className ?? ""}`} style={width ? { width, minWidth: width, maxWidth: width } : undefined}>
      {children}
      {onResizeStart && <ColumnResizeHandle onMouseDown={onResizeStart} />}
    </TableHead>
  )
}

/** Drag handle on a column's right edge — stopPropagation so it doesn't also trigger SortableHeader's onClick sort toggle. */
function ColumnResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none hover:bg-brand/40 active:bg-brand/60"
    />
  )
}

const CONTENT_HUB_COLUMN_WIDTHS_KEY = "content-hub-column-widths"
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  title: 220,
  type: 140,
  path: 180,
  category: 140,
  parent: 160,
  status: 110,
  created: 110,
  updated: 110,
}

/** User-draggable column widths, persisted across sessions (Charles, 2026-07-12: "les colonnes peuvent être modifiées dans leur largeur"). */
function useColumnWidths() {
  // Read once as the lazy initial state rather than useEffect+setState on
  // mount (React's react-hooks/set-state-in-effect: an effect calling
  // setState synchronously causes an avoidable extra render) — safe here
  // since this is a "use client" component and the guard covers the one
  // server-render pass that still evaluates it.
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return DEFAULT_COLUMN_WIDTHS
    try {
      const stored = localStorage.getItem(CONTENT_HUB_COLUMN_WIDTHS_KEY)
      return stored ? { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(stored) } : DEFAULT_COLUMN_WIDTHS
    } catch {
      // Ignore malformed/blocked storage — falls back to defaults.
      return DEFAULT_COLUMN_WIDTHS
    }
  })
  const resizing = useRef<{ key: string; startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const r = resizing.current
      if (!r) return
      const next = Math.max(70, r.startWidth + (e.clientX - r.startX))
      setWidths((w) => ({ ...w, [r.key]: next }))
    }
    function onMouseUp() {
      if (!resizing.current) return
      resizing.current = null
      setWidths((w) => {
        try {
          localStorage.setItem(CONTENT_HUB_COLUMN_WIDTHS_KEY, JSON.stringify(w))
        } catch {
          // Ignore — widths still work for this session even if persistence fails.
        }
        return w
      })
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  function startResize(key: string) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      resizing.current = { key, startX: e.clientX, startWidth: widths[key] ?? 100 }
    }
  }

  return { widths, startResize }
}

type ContentKind = "page" | "article" | "category"

interface ContentRow {
  kind: ContentKind
  id: string | number
  title: string
  path: string
  pageType?: string | null
  categoryName?: string | null
  // Articles never have a parent (blog posts are flat). Pages/Categories
  // do — set from the populated `parent` relation, resolved to the actual
  // row so clicking it can open that row's editor (see the Parent cell).
  parentId?: string | number | null
  parentTitle?: string | null
  // Categories have no publish/status concept — `status` stays "published"
  // so they always sort/filter as visible, but the table renders no
  // toggle for category rows (see the Status cell below).
  status: "draft" | "published"
  createdAt?: string | null
  updatedAt?: string | null
  syncStatus?: PayloadSyncStatus | null
}

const CONTENT_TYPE_OPTIONS = [
  { value: "landing", label: "Page" },
  { value: "documentation", label: "Documentation (wiki)" },
  { value: "article", label: "Article (blog)" },
  { value: "category", label: "Category" },
]

// One color per type key so the Type column reads at a glance instead of
// every row showing the same neutral outline badge (Charles, 2026-07-12).
const TYPE_BADGE_STYLES: Record<string, string> = {
  landing: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  documentation:
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300",
  article:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  category:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
}

/**
 * Pages/Categories/BlogPosts are all fetched at depth=1, so `parent`/
 * `category` relationship fields come back as populated objects
 * ({id, title|name, path}), never bare ids — payload-bridge.ts's summary
 * types were stale on this point (typed as `string | number | null`) which
 * made `categoryName()`/`category?.parent` reads below silently resolve to
 * nothing for any row with a real parent. These two helpers are the single
 * place that unwraps either shape.
 */
function relationId(value: string | number | { id: string | number } | null | undefined): string | number | null {
  if (value == null) return null
  return typeof value === "object" ? value.id : value
}

function relationLabel(value: { title?: string; name?: string } | string | number | null | undefined): string | null {
  if (value == null || typeof value !== "object") return null
  return value.title ?? value.name ?? null
}

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
  const { widths: colWidths, startResize } = useColumnWidths()
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
  const [categoryDescription, setCategoryDescription] = useState<unknown>(undefined)
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

  const categoryName = (id: string | number | { id: string | number } | null | undefined) =>
    categories.find((c) => String(c.id) === String(relationId(id)))?.path

  const allRows: ContentRow[] = useMemo(() => {
    const pageRows: ContentRow[] = allPages.map((p) => ({
      kind: "page",
      id: p.id,
      title: p.title,
      path: p.path,
      pageType: p.pageType ?? "landing",
      categoryName: p.category?.name ?? null,
      parentId: relationId(p.parent),
      parentTitle: relationLabel(p.parent),
      status: p._status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      syncStatus: p.syncStatus,
    }))
    const articleRows: ContentRow[] = allArticles.map((a) => ({
      kind: "article",
      id: a.id,
      title: a.title,
      path: `/blog/${a.slug}`,
      pageType: null,
      categoryName: categoryName(a.category),
      parentId: null,
      parentTitle: null,
      status: a._status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      syncStatus: a.syncStatus,
    }))
    const categoryRows: ContentRow[] = categories.map((c) => ({
      kind: "category",
      id: c.id,
      title: c.name,
      path: c.path,
      pageType: null,
      categoryName: c.parent ? categoryName(c.parent) : null,
      parentId: relationId(c.parent),
      parentTitle: relationLabel(c.parent),
      status: "published",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      syncStatus: null,
    }))
    return [...pageRows, ...articleRows, ...categoryRows]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPages, allArticles, categories])

  // O(1) parent lookup for the Parent column — a page's/category's parent
  // is always the same kind (Payload's relationTo is scoped that way), so
  // `${r.kind}:${r.parentId}` always hits the right row when it exists.
  const rowsByKey = useMemo(() => {
    const map = new Map<string, ContentRow>()
    allRows.forEach((row) => map.set(rowKey(row.kind, row.id), row))
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows])

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
      setCategoryDescription(undefined)
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
      setCategoryParentId(category?.parent ? String(relationId(category.parent)) : "")
      setCategoryDescription(category?.description)
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
      description: categoryDescription,
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
    const headers = ["Title", "Kind", "Type", "Path", "Category", "Parent", "Status", "Created At", "Updated At"]
    const rows = filtered.map((r) => [
      `"${r.title.replace(/"/g, '""')}"`,
      r.kind,
      r.pageType ?? "",
      r.path,
      r.categoryName ?? "",
      r.parentTitle ?? "",
      r.status,
      r.createdAt ?? "",
      r.updatedAt ?? "",
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
          <Table className="table-fixed">
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
                <SortableHeader
                  field="title"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  width={colWidths.title}
                  onResizeStart={startResize("title")}
                >
                  Title
                </SortableHeader>
                <ResizableHead width={colWidths.type} onResizeStart={startResize("type")}>
                  Type
                </ResizableHead>
                <SortableHeader
                  field="path"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  width={colWidths.path}
                  onResizeStart={startResize("path")}
                >
                  Path
                </SortableHeader>
                <ResizableHead width={colWidths.category} onResizeStart={startResize("category")}>
                  Category
                </ResizableHead>
                <ResizableHead width={colWidths.parent} onResizeStart={startResize("parent")}>
                  Parent
                </ResizableHead>
                <SortableHeader
                  field="status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  width={colWidths.status}
                  onResizeStart={startResize("status")}
                >
                  Status
                </SortableHeader>
                <SortableHeader
                  field="createdAt"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  width={colWidths.created}
                  onResizeStart={startResize("created")}
                >
                  Created
                </SortableHeader>
                <SortableHeader
                  field="updatedAt"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  width={colWidths.updated}
                  onResizeStart={startResize("updated")}
                >
                  Updated
                </SortableHeader>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    Loading content...
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    {search ? "No results for this search." : "No content yet."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((r) => {
                  const key = rowKey(r.kind, r.id)
                  const typeKey = r.kind === "article" || r.kind === "category" ? r.kind : (r.pageType ?? "landing")
                  const parentRow = r.parentId != null ? rowsByKey.get(rowKey(r.kind, r.parentId)) : undefined
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
                          <div
                            onClick={() => setEditingTitleId(key)}
                            title={r.title}
                            className="cursor-pointer truncate rounded px-2 py-1 hover:bg-muted/50"
                          >
                            {r.title}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_BADGE_STYLES[typeKey]}>
                          {r.kind === "article" || r.kind === "category"
                            ? r.kind
                            : (CONTENT_TYPE_OPTIONS.find((o) => o.value === (r.pageType ?? "landing"))?.label ?? r.pageType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="truncate font-mono text-xs">
                        {r.status === "published" ? (
                          <a
                            href={`/${locale}${r.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {r.path}
                            <ExternalLink className="h-3 w-3 shrink-0" />
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
                          <Badge variant="outline" className="max-w-full truncate">
                            {r.categoryName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {parentRow ? (
                          <button
                            type="button"
                            onClick={() => openEdit(parentRow)}
                            title={`Edit "${parentRow.title}"`}
                            className="max-w-full truncate rounded px-2 py-1 text-xs text-primary hover:bg-muted/50 hover:underline"
                          >
                            {parentRow.title}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.kind === "category" ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={r.status === "published"}
                              onCheckedChange={() => handleToggleStatus(r)}
                              aria-label={r.status === "published" ? "Published - click to unpublish" : "Draft - click to publish"}
                              title={r.status === "published" ? "Published - click to unpublish" : "Draft - click to publish"}
                            />
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
                      <TableCell className="text-xs text-muted-foreground">
                        {r.createdAt ? (
                          <>
                            <div>{new Date(r.createdAt).toLocaleDateString()}</div>
                            <div className="text-[10px]">{new Date(r.createdAt).toLocaleTimeString()}</div>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.updatedAt ? (
                          <>
                            <div>{new Date(r.updatedAt).toLocaleDateString()}</div>
                            <div className="text-[10px]">{new Date(r.updatedAt).toLocaleTimeString()}</div>
                          </>
                        ) : (
                          <span>—</span>
                        )}
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
            description={categoryDescription}
            headerImage={categoryHeaderImage}
            isSaving={isSavingCategory}
            onNameChange={setCategoryFormName}
            onSlugChange={setCategorySlug}
            onParentChange={setCategoryParentId}
            onDescriptionChange={setCategoryDescription}
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
  description,
  headerImage,
  isSaving,
  onNameChange,
  onSlugChange,
  onParentChange,
  onDescriptionChange,
  onHeaderImageChange,
  onSave,
}: {
  categories: PayloadCategorySummary[]
  editingId: string | number | undefined
  name: string
  slug: string
  parentId: string
  description: unknown
  headerImage: string
  isSaving: boolean
  onNameChange: (v: string) => void
  onSlugChange: (v: string) => void
  onParentChange: (v: string) => void
  onDescriptionChange: (v: unknown) => void
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
        <Label>Description</Label>
        {/* Same Lexical editor as an article's body (Charles, 2026-07-12:
            "un éditeur complet") — rendered by the category-list Content Hub
            block and on each category's own listing card. */}
        <RichTextEditor initialValue={description} onChange={onDescriptionChange} />
      </div>
      <div className="space-y-2">
        <Label>Header image</Label>
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
