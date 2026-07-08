"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Layers, Newspaper, Pencil, Plus, ChevronLeft, ChevronRight, FolderTree, AlertTriangle, Trash2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  getContentPages,
  getContentPage,
  removeContentPage,
  getContentArticles,
  getContentArticle,
  removeContentArticle,
  getContentCategories,
} from "@/app/actions/pages"
import type {
  PayloadPageSummary,
  PayloadPageDoc,
  PayloadBlogPostSummary,
  PayloadBlogPostDoc,
  PayloadCategorySummary,
} from "@/lib/payload-bridge"
import { CategoriesPanel } from "./content/categories-panel"
import { ContentSheet } from "./content/content-sheet"
import { PageEditor } from "./content/page-editor"
import { ArticleEditor } from "./content/article-editor"

const PAGE_SIZE = 20

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
 */
export function ContentHub() {
  return (
    <Tabs defaultValue="pages" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pages">
          <Layers className="h-3.5 w-3.5" /> Pages
        </TabsTrigger>
        <TabsTrigger value="articles">
          <Newspaper className="h-3.5 w-3.5" /> Articles
        </TabsTrigger>
        <TabsTrigger value="categories">
          <FolderTree className="h-3.5 w-3.5" /> Catégories
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pages">
        <PagesPanel />
      </TabsContent>
      <TabsContent value="articles">
        <ArticlesPanel />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesPanel />
      </TabsContent>
    </Tabs>
  )
}

function PagesPanel() {
  const [pages, setPages] = useState<PayloadPageSummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageType, setPageType] = useState<string>("all")
  // Payload silently defaulted to 'fr' (defaultLocale, fallback:true) with
  // no indication that's what was shown — this makes the choice explicit
  // (Charles, 2026-07-08: "on ne sait pas quelle langue est engagée").
  const [locale, setLocale] = useState<string>("fr")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<PayloadPageDoc | null>(null)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)

  async function load() {
    setIsLoading(true)
    const result = await getContentPages({ page, limit: PAGE_SIZE, pageType: pageType === "all" ? undefined : pageType, locale })
    if (result.success) {
      setPages(result.data.docs)
      setTotalPages(result.data.totalPages)
      setError(null)
    } else {
      setError(result.error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    load()
  }, [page, pageType, locale])

  function openCreate() {
    setEditingDoc(null)
    setSheetOpen(true)
  }

  async function openEdit(id: string | number) {
    setSheetOpen(true)
    setIsLoadingDoc(true)
    const result = await getContentPage(id)
    if (result.success) {
      setEditingDoc(result.data)
    } else {
      toast.error(result.error)
      setSheetOpen(false)
    }
    setIsLoadingDoc(false)
  }

  async function handleDelete(p: PayloadPageSummary) {
    const result = await removeContentPage(p.id)
    if (result.success) {
      toast.success("Page supprimée")
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
            <Layers className="h-5 w-5 text-brand" />
            Pages
          </CardTitle>
          <CardDescription>
            Pages authored centrally, editable directly here — live from Payload. Note : /pricing et /legal
            restent codées en dur (logique métier/paiement) et ne peuvent jamais être pilotées d&apos;ici, quel
            que soit ce que vous publiez sur ces chemins.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New page
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={pageType} onValueChange={(v) => { setPageType(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="landing">Landing</SelectItem>
                <SelectItem value="article">Article</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locale} onValueChange={(v) => { setLocale(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Title</TableHead>
                <TableHead className="min-w-[150px]">Path</TableHead>
                <TableHead className="min-w-[100px]">Type</TableHead>
                <TableHead className="min-w-[120px]">Category</TableHead>
                <TableHead className="min-w-[140px]">Author</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[140px]">Published</TableHead>
                <TableHead className="min-w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Loading pages...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              ) : pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No pages yet.
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.path}</TableCell>
                    <TableCell>
                      {p.pageType ? <Badge variant="outline">{p.pageType}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      {p.category ? (
                        <Badge variant="outline">{p.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.author?.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={p._status === "published" ? "default" : "outline"}>
                          {p._status === "published" ? "Published" : "Draft"}
                        </Badge>
                        {p.syncStatus?.ok === false && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{p.syncStatus.message ?? "Échec de synchronisation vers le site."}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(p.id)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Edit <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
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
        <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
      </CardContent>

      <ContentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editingDoc ? `Modifier "${editingDoc.title}"` : "Nouvelle page"}
      >
        {isLoadingDoc ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <PageEditor
            page={editingDoc}
            onSaved={() => {
              setSheetOpen(false)
              load()
            }}
          />
        )}
      </ContentSheet>
    </Card>
  )
}

function ArticlesPanel() {
  const [articles, setArticles] = useState<PayloadBlogPostSummary[]>([])
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [categoryId, setCategoryId] = useState<string>("all")
  const [locale, setLocale] = useState<string>("fr")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<PayloadBlogPostDoc | null>(null)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)

  useEffect(() => {
    getContentCategories().then((result) => {
      if (result.success) setCategories(result.data)
    })
  }, [])

  async function load() {
    setIsLoading(true)
    const result = await getContentArticles({ page, limit: PAGE_SIZE, category: categoryId === "all" ? undefined : categoryId, locale })
    if (result.success) {
      setArticles(result.data.docs)
      setTotalPages(result.data.totalPages)
      setError(null)
    } else {
      setError(result.error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    load()
  }, [page, categoryId, locale])

  const categoryName = (id: string | number | null) => categories.find((c) => String(c.id) === String(id))?.path

  function openCreate() {
    setEditingDoc(null)
    setSheetOpen(true)
  }

  async function openEdit(id: string | number) {
    setSheetOpen(true)
    setIsLoadingDoc(true)
    const result = await getContentArticle(id)
    if (result.success) {
      setEditingDoc(result.data)
    } else {
      toast.error(result.error)
      setSheetOpen(false)
    }
    setIsLoadingDoc(false)
  }

  async function handleDelete(a: PayloadBlogPostSummary) {
    const result = await removeContentArticle(a.id)
    if (result.success) {
      toast.success("Article supprimé")
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
            <Newspaper className="h-5 w-5 text-brand" />
            Articles
          </CardTitle>
          <CardDescription>Blog posts authored centrally, editable directly here — live from Payload.</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> New article
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1) }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.path || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locale} onValueChange={(v) => { setLocale(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Title</TableHead>
                <TableHead className="min-w-[120px]">Category</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading articles...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              ) : articles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No articles yet.
                  </TableCell>
                </TableRow>
              ) : (
                articles.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{categoryName(a.category) ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={a._status === "published" ? "default" : "outline"}>
                          {a._status === "published" ? "Published" : "Draft"}
                        </Badge>
                        {a.syncStatus?.ok === false && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{a.syncStatus.message ?? "Échec de synchronisation vers le site."}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(a.id)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Edit <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
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
        <PaginationControls page={page} totalPages={totalPages} onChange={setPage} />
      </CardContent>

      <ContentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editingDoc ? `Modifier "${editingDoc.title}"` : "Nouvel article"}
      >
        {isLoadingDoc ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <ArticleEditor
            article={editingDoc}
            onSaved={() => {
              setSheetOpen(false)
              load()
            }}
          />
        )}
      </ContentSheet>
    </Card>
  )
}

function PaginationControls({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Page {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
