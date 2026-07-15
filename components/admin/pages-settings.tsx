"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  House,
  Search,
  Settings,
  CheckSquare,
  Eye,
  EyeOff,
  ExternalLink,
  Trash,
  SlidersHorizontal,
  Loader2,
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
  PageWriteInput,
  BlogPostWriteInput,
  CategoryWriteInput,
} from "@/lib/payload-bridge"
import { ContentSheet } from "./content/content-sheet"
import { PageEditor } from "./content/page-editor"
import { ArticleEditor } from "./content/article-editor"
import { MediaPickerField } from "./content/media-picker-field"
import { RichTextEditor } from "./content/rich-text-editor"
import { ContentImportExportBar } from "./content/content-import-export-bar"
import { downloadJson, parseCsv, scopeRefToId } from "@/lib/admin/content-io"

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
 * Left out on purpose (not asked for, no clear content equivalent):
 * date-range filters.
 *
 * Export/Import (2026-07-15, Charles: "on doit être capable de uploader ou
 * downloader les contenus... en csv ou json") — CSV stays a flat summary
 * (title/status, safe to bulk-edit and re-import); JSON carries the full
 * doc (layout blocks, SEO...) for real backup/restore/migration. Categories
 * have no draft/publish concept, so CSV import only touches pages/articles.
 */
export function ContentHub() {
  return (
    // No TooltipProvider wraps the admin layout anywhere above this —
    // Radix's Tooltip.Root throws without one. The pre-existing sync-status
    // warning icon never hit this because its condition (syncStatus.ok ===
    // false) was never true in practice; the per-row publish/unpublish
    // toggle below renders unconditionally and surfaced it immediately
    // (confirmed live 2026-07-09: `Tooltip must be used within TooltipProvider`).
    //
    // Media used to live in a "Media" tab here (Charles, 2026-07-11) — moved
    // to its own admin page (/admin/pages?type=media, see
    // app/(private)/admin/pages/page.tsx) alongside Header/Footer, same
    // pattern as the sidebar's Content sub-links (Charles, 2026-07-14: "sa
    // propre page au lieu d'un onglet en sous menu de content"). Only one
    // tab left, so the Tabs wrapper is gone too.
    <TooltipProvider>
      <ContentPanel />
    </TooltipProvider>
  )
}

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

const LOCALE_LABELS: Record<string, string> = { fr: "Français", en: "English" }
const LOCALE_FLAGS: Record<string, string> = { fr: "🇫🇷", en: "🇬🇧" }

const CONTENT_HUB_COLUMN_WIDTHS_KEY = "content-hub-column-widths"
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  title: 220,
  type: 140,
  path: 180,
  category: 140,
  parent: 160,
  author: 140,
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
  // Charles (2026-07-15): "un bouton cliquable qui détermine une page comme
  // page d'accueil de sa langue" — read-only display, Payload's own admin
  // is the only place this is editable (payload-cms Pages.homeForLocale).
  homeForLocale?: "" | "fr" | "en" | null
  // Only populated in "all languages" mode (locale === "all") — which
  // locales this page/article actually has real (non-fallback) content in,
  // used to render one flag per language instead of just the currently
  // selected one. In single-locale mode this is just [locale] (every
  // visible row is already filtered down to real content in that language).
  translatedLocales?: string[]
  // Charles (2026-07-15): "par utilisateur (qui lui a perdu sa colonne)" —
  // the old per-kind tabs had an Author column, dropped when Pages/Articles/
  // Categories merged into one table. Categories have no author field.
  authorId?: string | number | null
  authorName?: string | null
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
  // "all" is a display mode, not a real Payload locale — see load()'s
  // special-cased fetch below (fr+en merged) and editingLocale (which
  // locale the editor sheet actually opens on, since "all" itself can't be
  // passed to getContentPage).
  const [locale, setLocale] = useState<string>("fr")
  const [editingLocale, setEditingLocale] = useState<string>("fr")
  // Keyed by rowKey(kind, id) — which locales have real content, only
  // populated when locale === "all" (see load()).
  const [translatedLocalesByKey, setTranslatedLocalesByKey] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [authorFilter, setAuthorFilter] = useState<string>("all")
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")
  // Same pattern as /admin/products (Charles, 2026-07-15: "c'est plus
  // logique" — Columns/Export/Import together, filters below) — Title is
  // always shown (required, matches Products keeping Title non-toggleable).
  const [visibleColumns, setVisibleColumns] = useState({
    category: true,
    parent: true,
    author: true,
    created: true,
    updated: true,
  })
  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }))
  }
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContentRow | null>(null)
  // Rows currently saving a status toggle — shows a per-row spinner instead
  // of the old behavior (Charles, 2026-07-13: "une modification ne doit pas
  // entrainer un reload de la page, mais juste de la ligne") of calling
  // load() and flipping the whole table to its loading state.
  const [savingStatusKeys, setSavingStatusKeys] = useState<Set<string>>(new Set())
  const [savingHomeKeys, setSavingHomeKeys] = useState<Set<string>>(new Set())

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
  // "all" is a display mode, not a real Payload locale (see load()) — every
  // inline table action (title edit, publish toggle, home toggle) needs one
  // real locale to save against; defaults to fr, matching this table's
  // pre-existing default everywhere else.
  const saveLocale = locale === "all" ? "fr" : locale

  useEffect(() => {
    // Categories aren't localized (out of scope, see payload-cms's
    // Categories.ts) — "all" isn't a real Payload locale, fetch fr always.
    getContentCategories(locale === "all" ? "fr" : locale).then((result) => {
      if (result.success) setCategories(result.data)
    })
  }, [locale])

  // Merges the fr and en fetch of the same collection into one row per id —
  // Payload's list always returns every doc regardless of locale (fallback
  // disabled per-request, see lib/payload-bridge.ts), just with `title`
  // empty when that locale has no real content — so both arrays already
  // share the same ids. Picks fr's fields as the display source when
  // translated, else falls back to en's, and records which locale(s) are
  // real for the flag column.
  function mergeLocales<T extends { id: string | number; title: string }>(
    frDocs: T[],
    enDocs: T[],
  ): { doc: T; locales: string[] }[] {
    const enById = new Map(enDocs.map((d) => [String(d.id), d]))
    return frDocs.map((frDoc) => {
      const enDoc = enById.get(String(frDoc.id))
      const locales: string[] = []
      if (frDoc.title) locales.push("fr")
      if (enDoc?.title) locales.push("en")
      return { doc: frDoc.title ? frDoc : (enDoc ?? frDoc), locales }
    })
  }

  async function load() {
    setIsLoading(true)
    if (locale === "all") {
      const [pagesFr, pagesEn, articlesFr, articlesEn] = await Promise.all([
        getContentPages({ limit: FETCH_ALL_LIMIT, locale: "fr" }),
        getContentPages({ limit: FETCH_ALL_LIMIT, locale: "en" }),
        getContentArticles({ limit: FETCH_ALL_LIMIT, locale: "fr" }),
        getContentArticles({ limit: FETCH_ALL_LIMIT, locale: "en" }),
      ])
      const localesByKey: Record<string, string[]> = {}
      if (pagesFr.success && pagesEn.success) {
        const merged = mergeLocales(pagesFr.data.docs, pagesEn.data.docs)
        setAllPages(merged.map((m) => m.doc))
        merged.forEach((m) => (localesByKey[rowKey("page", m.doc.id)] = m.locales))
      }
      if (articlesFr.success && articlesEn.success) {
        const merged = mergeLocales(articlesFr.data.docs, articlesEn.data.docs)
        setAllArticles(merged.map((m) => m.doc))
        merged.forEach((m) => (localesByKey[rowKey("article", m.doc.id)] = m.locales))
      }
      setTranslatedLocalesByKey(localesByKey)
      setError(
        !pagesFr.success ? pagesFr.error : !pagesEn.success ? pagesEn.error
        : !articlesFr.success ? articlesFr.error : !articlesEn.success ? articlesEn.error : null,
      )
      setIsLoading(false)
      return
    }

    const [pagesResult, articlesResult] = await Promise.all([
      getContentPages({ limit: FETCH_ALL_LIMIT, locale }),
      getContentArticles({ limit: FETCH_ALL_LIMIT, locale }),
    ])
    if (pagesResult.success) setAllPages(pagesResult.data.docs)
    if (articlesResult.success) setAllArticles(articlesResult.data.docs)
    setTranslatedLocalesByKey({})
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
  }, [search, itemsPerPage, sortField, sortDirection, typeFilter, authorFilter, startDateFilter, endDateFilter])

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
      homeForLocale: p.homeForLocale,
      translatedLocales: translatedLocalesByKey[rowKey("page", p.id)] ?? [locale],
      authorId: p.author?.id ?? null,
      authorName: p.author?.name ?? p.author?.email ?? null,
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
      translatedLocales: translatedLocalesByKey[rowKey("article", a.id)] ?? [locale],
      authorId: a.author?.id ?? null,
      authorName: a.author?.name ?? a.author?.email ?? null,
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
  }, [allPages, allArticles, categories, translatedLocalesByKey, locale])

  // O(1) parent lookup for the Parent column — a page's/category's parent
  // is always the same kind (Payload's relationTo is scoped that way), so
  // `${r.kind}:${r.parentId}` always hits the right row when it exists.
  const rowsByKey = useMemo(() => {
    const map = new Map<string, ContentRow>()
    allRows.forEach((row) => map.set(rowKey(row.kind, row.id), row))
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows])

  // 8 fixed columns (checkbox, locale flag, home, Title, Type, Path, Status,
  // Actions) + however many optional columns are currently toggled on.
  const visibleColumnCount = 8 + Object.values(visibleColumns).filter(Boolean).length

  const authorOptions = useMemo(() => {
    const byId = new Map<string, string>()
    allRows.forEach((r) => {
      if (r.authorId != null) byId.set(String(r.authorId), r.authorName ?? String(r.authorId))
    })
    return Array.from(byId, ([id, name]) => ({ id, name }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    // Pages/Articles are localized (Payload's `fallback: true` normally
    // means an untranslated one still returns with French content quietly
    // standing in) — allPages/allArticles are fetched with fallback-locale
    // disabled (lib/payload-bridge.ts's listPages/listBlogPosts) so `title`
    // comes back genuinely empty here for a page/article with no real
    // content in `locale` yet. Filtering those out is what makes switching
    // the language selector actually change which rows show, instead of
    // relisting the same rows with silently-French text (Charles,
    // 2026-07-15: "quelle que soit la langue concernée, tout est affiché").
    // Categories aren't localized — always shown regardless of `locale`.
    let list = allRows.filter((r) => r.kind === "category" || Boolean(r.title))
    if (typeFilter !== "all") {
      list = list.filter((r) =>
        r.kind === "article" || r.kind === "category" ? r.kind === typeFilter : r.pageType === typeFilter,
      )
    }
    if (authorFilter !== "all") {
      list = list.filter((r) => String(r.authorId ?? "") === authorFilter)
    }
    if (startDateFilter) {
      const start = new Date(startDateFilter).getTime()
      list = list.filter((r) => r.createdAt && new Date(r.createdAt).getTime() >= start)
    }
    if (endDateFilter) {
      const end = new Date(endDateFilter).getTime() + 24 * 60 * 60 * 1000 - 1
      list = list.filter((r) => r.createdAt && new Date(r.createdAt).getTime() <= end)
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
  }, [allRows, search, sortField, sortDirection, typeFilter, authorFilter, startDateFilter, endDateFilter])

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
    setEditingLocale(locale === "all" ? "fr" : locale)
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

  // `targetLocale` lets a flag click in "all languages" mode (locale ===
  // "all", not itself a real Payload locale) open the editor directly on
  // one specific language — defaults to the outer `locale` filter, falling
  // back to fr when that filter is "all" and no specific flag was clicked.
  async function openEdit(row: ContentRow, targetLocale?: string) {
    const openLocale = targetLocale ?? (locale === "all" ? "fr" : locale)
    setEditingLocale(openLocale)
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
      const result = await getContentPage(row.id, openLocale)
      if (result.success) setEditingPageDoc(result.data)
      else {
        toast.error(result.error)
        setSheetOpen(false)
      }
    } else {
      const result = await getContentArticle(row.id, openLocale)
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
        ? await saveContentPage(row.id, { title: title.trim() }, saveLocale)
        : row.kind === "article"
          ? await saveContentArticle(row.id, { title: title.trim() }, saveLocale)
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
    const key = rowKey(row.kind, row.id)
    const next = row.status === "published" ? "draft" : "published"
    setSavingStatusKeys((prev) => new Set(prev).add(key))
    const result =
      row.kind === "page"
        ? await saveContentPage(row.id, { _status: next }, saveLocale)
        : await saveContentArticle(row.id, { _status: next }, saveLocale)
    setSavingStatusKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    if (result.success) {
      toast.success(next === "published" ? "Published" : "Unpublished")
      // Patch just this row in place instead of load() (a full refetch of
      // every page/article) — that used to flip the whole table back to
      // its "Loading content..." state for a single toggle.
      const patch = { _status: result.data._status, updatedAt: result.data.updatedAt, syncStatus: result.data.syncStatus }
      if (row.kind === "page") {
        setAllPages((prev) => prev.map((p) => (p.id === row.id ? { ...p, ...patch } : p)))
      } else {
        setAllArticles((prev) => prev.map((a) => (a.id === row.id ? { ...a, ...patch } : a)))
      }
    } else {
      toast.error(result.error)
    }
  }

  // Home-page-per-locale is a Pages-only field (payload-cms's
  // Pages.homeForLocale) — articles/categories have no such concept.
  // Toggling here writes straight through saveContentPage, same partial-PATCH
  // path as handleToggleStatus above; Payload's own validateUniqueHomeForLocale
  // rejects a second page claiming the same locale, surfaced as a toast.
  async function handleToggleHome(row: ContentRow) {
    if (row.kind !== "page") return
    const key = rowKey(row.kind, row.id)
    const isHome = row.homeForLocale === saveLocale
    const next: "" | "fr" | "en" = isHome ? "" : (saveLocale as "fr" | "en")
    setSavingHomeKeys((prev) => new Set(prev).add(key))
    const result = await saveContentPage(row.id, { homeForLocale: next }, saveLocale)
    setSavingHomeKeys((prev) => {
      const nextSet = new Set(prev)
      nextSet.delete(key)
      return nextSet
    })
    if (result.success) {
      toast.success(next ? `Set as home page (${saveLocale})` : "Removed as home page")
      setAllPages((prev) => prev.map((p) => (p.id === row.id ? { ...p, homeForLocale: result.data.homeForLocale } : p)))
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
          ? await saveContentPage(row.id, { _status: status }, saveLocale)
          : await saveContentArticle(row.id, { _status: status }, saveLocale)
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
    const headers = ["ID", "Title", "Kind", "Type", "Path", "Category", "Parent", "Status", "Created At", "Updated At"]
    const rows = filtered.map((r) => [
      `"${r.id}"`,
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

  // Full-fidelity backup/restore/migration — one {kind, doc} entry per row,
  // doc being the real PageWriteInput/BlogPostWriteInput/CategoryWriteInput
  // shape saveContentPage/saveContentArticle/saveCategory already accept.
  async function handleExportJson() {
    const targetRows = selectedIds.size > 0 ? filtered.filter((r) => selectedIds.has(rowKey(r.kind, r.id))) : filtered
    if (targetRows.length === 0) {
      toast.error("No content to export")
      return
    }
    const entries = await Promise.all(
      targetRows.map(async (row) => {
        if (row.kind === "page") {
          const result = await getContentPage(row.id, saveLocale)
          return result.success ? { kind: "page" as const, doc: result.data } : null
        }
        if (row.kind === "article") {
          const result = await getContentArticle(row.id, saveLocale)
          return result.success ? { kind: "article" as const, doc: result.data } : null
        }
        const category = categories.find((c) => c.id === row.id)
        return category ? { kind: "category" as const, doc: category } : null
      }),
    )
    const valid = entries.filter((e): e is NonNullable<typeof e> => e !== null)
    const failed = entries.length - valid.length
    downloadJson("content_export", valid)
    toast[failed > 0 ? "warning" : "success"](`${valid.length} item(s) exported${failed > 0 ? `, ${failed} failed` : ""}`)
  }

  async function importJsonEntries(entries: { kind: string; doc: Record<string, unknown> }[]) {
    let ok = 0
    let fail = 0
    for (const entry of entries) {
      const doc = entry.doc
      try {
        if (entry.kind === "page") {
          const input: PageWriteInput = {
            title: String(doc.title ?? ""),
            slug: String(doc.slug ?? ""),
            parent: scopeRefToId(doc.parent as never),
            pageType: (doc.pageType as string) ?? "landing",
            category: scopeRefToId(doc.category as never),
            layout: (doc.layout as PageWriteInput["layout"]) ?? [],
            seo: doc.seo as PageWriteInput["seo"],
            includeSiteNameInTitle: doc.includeSiteNameInTitle as boolean | undefined,
            scheduledPublishAt: doc.scheduledPublishAt as string | null | undefined,
            scheduledUnpublishAt: doc.scheduledUnpublishAt as string | null | undefined,
            homeForLocale: doc.homeForLocale as PageWriteInput["homeForLocale"],
            _status: (doc._status as "draft" | "published") ?? "draft",
          }
          const result = await saveContentPage((doc.id as string | number) ?? null, input, saveLocale)
          result.success ? ok++ : fail++
        } else if (entry.kind === "article") {
          const input: BlogPostWriteInput = {
            title: String(doc.title ?? ""),
            slug: String(doc.slug ?? ""),
            category: scopeRefToId(doc.category as never),
            excerpt: doc.excerpt as string | undefined,
            body: doc.body,
            publishedAt: doc.publishedAt as string | null | undefined,
            seo: doc.seo as BlogPostWriteInput["seo"],
            includeSiteNameInTitle: doc.includeSiteNameInTitle as boolean | undefined,
            scheduledPublishAt: doc.scheduledPublishAt as string | null | undefined,
            scheduledUnpublishAt: doc.scheduledUnpublishAt as string | null | undefined,
            _status: (doc._status as "draft" | "published") ?? "draft",
          } as BlogPostWriteInput
          const result = await saveContentArticle((doc.id as string | number) ?? null, input, saveLocale)
          result.success ? ok++ : fail++
        } else if (entry.kind === "category") {
          const input: CategoryWriteInput = {
            name: String(doc.name ?? ""),
            slug: String(doc.slug ?? ""),
            parent: scopeRefToId(doc.parent as never),
            description: doc.description,
            headerImage: doc.headerImage as string | null | undefined,
          }
          const result = await saveCategory((doc.id as string | number) ?? null, input)
          result.success ? ok++ : fail++
        } else {
          fail++
        }
      } catch {
        fail++
      }
    }
    return { ok, fail }
  }

  // CSV import stays deliberately narrow — title/status only, matched by ID
  // + Kind (both present since the CSV export above added them), and only
  // for pages/articles (categories have no _status to bulk-toggle). Full
  // content restructuring (layout blocks, SEO...) goes through JSON import.
  async function importCsvRows(text: string) {
    const [header, ...rows] = parseCsv(text)
    const idIdx = header.indexOf("ID")
    const kindIdx = header.indexOf("Kind")
    const titleIdx = header.indexOf("Title")
    const statusIdx = header.indexOf("Status")
    if (idIdx === -1 || kindIdx === -1) {
      throw new Error("CSV must include ID and Kind columns (use the Export CSV button as a starting point)")
    }
    let ok = 0
    let fail = 0
    for (const row of rows) {
      const id = row[idIdx]
      const kind = row[kindIdx]
      if (!id || kind === "category") continue
      const input: Partial<PageWriteInput | BlogPostWriteInput> = {}
      if (titleIdx !== -1 && row[titleIdx]) input.title = row[titleIdx]
      if (statusIdx !== -1 && (row[statusIdx] === "draft" || row[statusIdx] === "published")) {
        input._status = row[statusIdx] as "draft" | "published"
      }
      const result = kind === "page" ? await saveContentPage(id, input, saveLocale) : await saveContentArticle(id, input, saveLocale)
      result.success ? ok++ : fail++
    }
    return { ok, fail }
  }

  async function handleImportFile(file: File) {
    const isJson = file.name.toLowerCase().endsWith(".json")
    try {
      const { ok, fail } = isJson ? await importJsonEntries(JSON.parse(await file.text())) : await importCsvRows(await file.text())
      toast[fail > 0 ? "warning" : "success"](`${ok} item(s) imported${fail > 0 ? `, ${fail} failed` : ""}`)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed")
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Settings className="h-3.5 w-3.5" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-semibold">Visible Columns</div>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={visibleColumns.category} onCheckedChange={() => toggleColumn("category")}>
                Category
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.parent} onCheckedChange={() => toggleColumn("parent")}>
                Parent
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.author} onCheckedChange={() => toggleColumn("author")}>
                Author
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.created} onCheckedChange={() => toggleColumn("created")}>
                Created Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={visibleColumns.updated} onCheckedChange={() => toggleColumn("updated")}>
                Updated Date
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ContentImportExportBar
            onExportJson={handleExportJson}
            onExportCsv={handleExportCSV}
            onImportFile={handleImportFile}
            importAccept=".json,.csv"
          />
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
          <div className="hidden gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-6">
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
                <SelectItem value="all">🌐 Toutes les langues</SelectItem>
              </SelectContent>
            </Select>
            <Select value={authorFilter} onValueChange={setAuthorFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Author" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All authors</SelectItem>
                {authorOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <Input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="h-10 flex-1"
                title="Created after"
              />
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="h-10 flex-1"
                title="Created before"
              />
            </div>
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
                <Label>Author</Label>
                <Select value={authorFilter} onValueChange={setAuthorFilter}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All authors</SelectItem>
                    {authorOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Created between</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="h-12 flex-1 text-base"
                  />
                  <Input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="h-12 flex-1 text-base"
                  />
                </div>
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
        {/* Below md, the table's ~1350px of pinned column widths forces
            horizontal scrolling to reach Status/Actions — Charles
            (2026-07-15): "tout doit être visible" on mobile, no
            horizontal-scroll table. A stacked card list replaces it there;
            the table (with its column resize/sort UX) stays for md: and up. */}
        <div className="space-y-2 md:hidden">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading content...</p>
          ) : paginated.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? "No results for this search." : "No content yet."}
            </p>
          ) : (
            paginated.map((r) => {
              const key = rowKey(r.kind, r.id)
              const typeKey = r.kind === "article" || r.kind === "category" ? r.kind : (r.pageType ?? "landing")
              const parentRow = r.parentId != null ? rowsByKey.get(rowKey(r.kind, r.parentId)) : undefined
              return (
                <div key={key} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={selectedIds.has(key)}
                      onCheckedChange={() => toggleSelect(key)}
                      aria-label={`Select ${r.title}`}
                      className="mt-1 shrink-0"
                    />
                    {r.kind === "category" ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted">
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ) : locale === "all" ? (
                      <div className="flex shrink-0 gap-0.5">
                        {(["fr", "en"] as const).map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => openEdit(r, loc)}
                            title={r.translatedLocales?.includes(loc) ? `Edit ${LOCALE_LABELS[loc]} content` : `Not translated yet — add ${LOCALE_LABELS[loc]} content`}
                            className={`flex h-9 w-4 items-center justify-center rounded-md border text-sm ${
                              r.translatedLocales?.includes(loc) ? "bg-muted" : "bg-transparent opacity-30"
                            }`}
                          >
                            {LOCALE_FLAGS[loc]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-base" title={`${LOCALE_LABELS[locale] ?? locale} content`}>
                        {LOCALE_FLAGS[locale] ?? "🌐"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={TYPE_BADGE_STYLES[typeKey]}>
                          {r.kind === "article" || r.kind === "category"
                            ? r.kind
                            : (CONTENT_TYPE_OPTIONS.find((o) => o.value === (r.pageType ?? "landing"))?.label ?? r.pageType)}
                        </Badge>
                        {r.categoryName && (
                          <Badge variant="outline" className="max-w-full truncate">
                            {r.categoryName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
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
                  </div>

                  <div className="truncate pl-11 font-mono text-xs">
                    {r.status === "published" ? (
                      <a
                        href={`/${r.translatedLocales?.[0] ?? saveLocale}${r.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {r.path}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{r.path} (draft)</span>
                    )}
                  </div>

                  {parentRow && (
                    <div className="pl-11 text-xs text-muted-foreground">
                      Parent:{" "}
                      <button type="button" onClick={() => openEdit(parentRow)} className="text-primary hover:underline">
                        {parentRow.title}
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pl-11 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {r.kind !== "category" && (
                        <div className="flex items-center gap-1.5">
                          {savingStatusKeys.has(key) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Switch
                              checked={r.status === "published"}
                              onCheckedChange={() => handleToggleStatus(r)}
                              aria-label={r.status === "published" ? "Published - click to unpublish" : "Draft - click to publish"}
                            />
                          )}
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
                    </div>
                    <span>{r.updatedAt ? `Updated ${new Date(r.updatedAt).toLocaleDateString()}` : ""}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden rounded-md border overflow-x-auto md:block">
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
                <TableHead className="w-[56px]" title="Home page for the selected language">
                  <House className="h-3.5 w-3.5 text-muted-foreground" />
                </TableHead>
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
                {visibleColumns.category && (
                  <ResizableHead width={colWidths.category} onResizeStart={startResize("category")}>
                    Category
                  </ResizableHead>
                )}
                {visibleColumns.parent && (
                  <ResizableHead width={colWidths.parent} onResizeStart={startResize("parent")}>
                    Parent
                  </ResizableHead>
                )}
                {visibleColumns.author && (
                  <ResizableHead width={colWidths.author} onResizeStart={startResize("author")}>
                    Author
                  </ResizableHead>
                )}
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
                {visibleColumns.created && (
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
                )}
                {visibleColumns.updated && (
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
                )}
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="h-24 text-center">
                    Loading content...
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="h-24 text-center">
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
                        {r.kind === "category" ? (
                          <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
                            <FolderTree className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ) : locale === "all" ? (
                          <div className="flex gap-1">
                            {(["fr", "en"] as const).map((loc) => {
                              const isTranslated = r.translatedLocales?.includes(loc)
                              return (
                                <Tooltip key={loc}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => openEdit(r, loc)}
                                      className={`flex h-9 w-9 items-center justify-center rounded-md border text-base transition-colors ${
                                        isTranslated ? "bg-muted" : "bg-transparent opacity-30 hover:opacity-60"
                                      }`}
                                    >
                                      {LOCALE_FLAGS[loc]}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {isTranslated
                                        ? `Edit ${LOCALE_LABELS[loc]} content`
                                        : `Not translated yet — click to add ${LOCALE_LABELS[loc]} content`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted text-base" title={`${LOCALE_LABELS[locale] ?? locale} content`}>
                            {LOCALE_FLAGS[locale] ?? "🌐"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.kind === "page" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleToggleHome(r)}
                                disabled={savingHomeKeys.has(key)}
                                aria-label={
                                  r.homeForLocale === saveLocale
                                    ? `Home page for ${saveLocale} — click to unset`
                                    : `Set as home page for ${saveLocale}`
                                }
                                className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                                  r.homeForLocale === saveLocale
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {savingHomeKeys.has(key) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <House className="h-4 w-4" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {r.homeForLocale === saveLocale
                                  ? `Home page for ${saveLocale} — click to unset`
                                  : `Set as home page for ${saveLocale}`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center" />
                        )}
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
                            className="flex items-center gap-1.5 cursor-pointer truncate rounded px-2 py-1 hover:bg-muted/50"
                          >
                            <span className="truncate">{r.title}</span>
                            {r.homeForLocale && (
                              <Badge variant="outline" className="shrink-0 gap-1 text-xs" title={`Page d'accueil (${r.homeForLocale})`}>
                                🏠 {r.homeForLocale}
                              </Badge>
                            )}
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
                            href={`/${r.translatedLocales?.[0] ?? saveLocale}${r.path}`}
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
                      {visibleColumns.category && (
                        <TableCell>
                          {r.categoryName ? (
                            <Badge variant="outline" className="max-w-full truncate">
                              {r.categoryName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.parent && (
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
                      )}
                      {visibleColumns.author && (
                        <TableCell className="truncate text-xs text-muted-foreground" title={r.authorName ?? undefined}>
                          {r.authorName ?? "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        {r.kind === "category" ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {savingStatusKeys.has(key) ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Switch
                                checked={r.status === "published"}
                                onCheckedChange={() => handleToggleStatus(r)}
                                aria-label={r.status === "published" ? "Published - click to unpublish" : "Draft - click to publish"}
                                title={r.status === "published" ? "Published - click to unpublish" : "Draft - click to publish"}
                              />
                            )}
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
                      {visibleColumns.created && (
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
                      )}
                      {visibleColumns.updated && (
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
                      )}
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
            locale={editingLocale}
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
            locale={editingLocale}
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
