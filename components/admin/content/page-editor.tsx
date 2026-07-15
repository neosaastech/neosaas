"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  saveContentPage,
  getContentPage,
  getContentCategories,
  getContentPages,
  getContentPageVersions,
  restoreContentPageVersion,
} from "@/app/actions/pages"
import type { PayloadPageDoc, PayloadPageBlock, PayloadCategorySummary, PayloadPageSummary, PayloadPageVersion } from "@/lib/payload-bridge"
import { BlockEditor } from "./block-editor"
import { BlockPickerDialog } from "./block-picker-dialog"
import { BlockPreview } from "./block-preview"
import { ResponsivePreviewFrame } from "./responsive-preview-frame"
import { TemplateVariablesHint } from "./template-variables-hint"
import { Badge } from "@/components/ui/badge"
import { SeoLengthIndicator } from "./seo-length-indicator"
import { MediaPickerField } from "./media-picker-field"
import { useAutosave } from "./use-autosave"

interface PageFormValues {
  title: string
  slug: string
  pageType: string
  categoryId: string
  parentId: string
  metaTitle: string
  metaDescription: string
  headerImage: string
  noIndex: boolean
  noFollow: boolean
  includeSiteNameInTitle: boolean
  scheduledPublishAt: string
  scheduledUnpublishAt: string
  homeForLocale: "" | "fr" | "en"
  layout: PayloadPageBlock[]
}

// <input type="datetime-local"> works in local time with no timezone
// ("YYYY-MM-DDTHH:mm"), Payload stores/returns a UTC ISO string — these
// convert between the two at the read/write boundary only.
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(value: string): string | undefined {
  if (!value) return undefined
  return new Date(value).toISOString()
}

export function PageEditor({
  page,
  locale = "fr",
  onSaved,
  initialPageType,
}: {
  page: PayloadPageDoc | null
  locale?: string
  onSaved?: () => void
  /** Pre-selects Page type on a brand-new page (e.g. "New content" > "Documentation page") — ignored once `page` is set. */
  initialPageType?: string
}) {
  const router = useRouter()
  // Which language's content is currently loaded in the form below — starts
  // at whatever the Content Hub's list filter was on, but can be switched
  // right here without closing the editor (Charles, 2026-07-15: "mettre la
  // fonction de type de langue à générer dans l'éditeur" — generating/
  // editing the other language's translation of the same page/header/
  // footer/module without leaving the sheet).
  const [activeLocale, setActiveLocale] = useState(locale)
  const [isSwitchingLocale, setIsSwitchingLocale] = useState(false)
  const [title, setTitle] = useState(page?.title ?? "")
  const [slug, setSlug] = useState(page?.slug ?? "")
  const [pageType, setPageType] = useState(page?.pageType ?? initialPageType ?? "")
  const [categoryId, setCategoryId] = useState<string>(page?.category ? String(page.category.id) : "")
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [parentId, setParentId] = useState<string>(page?.parent ? String(page.parent) : "")
  const [pages, setPages] = useState<PayloadPageSummary[]>([])
  const [metaTitle, setMetaTitle] = useState(page?.seo?.metaTitle ?? "")
  const [metaDescription, setMetaDescription] = useState(page?.seo?.metaDescription ?? "")
  const [headerImage, setHeaderImage] = useState(page?.seo?.image ?? "")
  const [noIndex, setNoIndex] = useState(page?.seo?.noIndex ?? false)
  const [noFollow, setNoFollow] = useState(page?.seo?.noFollow ?? false)
  const [scheduledPublishAt, setScheduledPublishAt] = useState(isoToLocalInput(page?.scheduledPublishAt))
  const [scheduledUnpublishAt, setScheduledUnpublishAt] = useState(isoToLocalInput(page?.scheduledUnpublishAt))
  const [includeSiteNameInTitle, setIncludeSiteNameInTitle] = useState(page?.includeSiteNameInTitle ?? true)
  const [homeForLocale, setHomeForLocale] = useState<"" | "fr" | "en">(page?.homeForLocale ?? "")
  const [layout, setLayout] = useState<PayloadPageBlock[]>(page?.layout ?? [])
  const [isPublishing, setIsPublishing] = useState(false)
  // Tracks the real document status/path for the "Final path"/"View live"
  // hint below — `page` itself is a frozen prop from when the sheet opened,
  // it never reflects a publish that just happened in this same session.
  const [docStatus, setDocStatus] = useState(page?._status)
  const [docPath, setDocPath] = useState(page?.path)
  const [docPublishedAt, setDocPublishedAt] = useState(page?.publishedAt)
  // A ref, not state: autosave calls must see a just-created id immediately
  // (before the next React render), otherwise two rapid edits on a brand
  // new page would each call createPage and produce two Payload documents.
  const docIdRef = useRef<string | number | null>(page?.id ?? null)
  // How many blocks existed when the editor opened — anything at or past
  // this index was added during the current session and starts expanded
  // (see BlockEditor's defaultExpanded); anything before it was loaded
  // with the doc and starts collapsed.
  const initialBlockCountRef = useRef(page?.layout?.length ?? 0)
  // Charles (2026-07-15): "quand j'ajoute un module dans ma page elle
  // saute" — a newly added block starts fully expanded (defaultExpanded
  // above) at the BOTTOM of a possibly-long block list, while the "Add
  // block" button the user just clicked sits at the TOP — the sudden height
  // increase far below the viewport reads as the whole page jumping/
  // shifting with nothing visibly changing near the cursor. Scrolling the
  // new block into view anchors that layout shift instead of leaving it
  // to happen off-screen.
  const justAddedIndexRef = useRef<number | null>(null)
  // Charles (2026-07-15): "le versionning temporel qui est une realite dans
  // payload" — Pages already produce a version snapshot on every save
  // (versions:{drafts:true}), just never surfaced outside Payload's own
  // separate admin. Fetched lazily (Settings tab only) rather than on every
  // editor open, since most edits never need it.
  const [versions, setVersions] = useState<PayloadPageVersion[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null)
  const versionsLoadedRef = useRef(false)

  useEffect(() => {
    getContentCategories().then((result) => {
      if (result.success) setCategories(result.data)
    })
    getContentPages({ limit: 200 }).then((result) => {
      if (result.success) setPages(result.data.docs)
    })
  }, [])

  // Resets every field from a freshly-fetched doc — same mapping as the
  // useState initializers above, factored out so switching language can
  // reload the form in place instead of only running once at mount.
  function applyDoc(doc: PayloadPageDoc) {
    setTitle(doc.title ?? "")
    setSlug(doc.slug ?? "")
    setPageType(doc.pageType ?? "")
    setCategoryId(doc.category ? String(doc.category.id) : "")
    setParentId(doc.parent ? String(doc.parent) : "")
    setMetaTitle(doc.seo?.metaTitle ?? "")
    setMetaDescription(doc.seo?.metaDescription ?? "")
    setHeaderImage(doc.seo?.image ?? "")
    setNoIndex(doc.seo?.noIndex ?? false)
    setNoFollow(doc.seo?.noFollow ?? false)
    setScheduledPublishAt(isoToLocalInput(doc.scheduledPublishAt))
    setScheduledUnpublishAt(isoToLocalInput(doc.scheduledUnpublishAt))
    setIncludeSiteNameInTitle(doc.includeSiteNameInTitle ?? true)
    setHomeForLocale(doc.homeForLocale ?? "")
    setLayout(doc.layout ?? [])
    setDocStatus(doc._status)
    setDocPath(doc.path)
    setDocPublishedAt(doc.publishedAt)
    initialBlockCountRef.current = doc.layout?.length ?? 0
  }

  async function handleLocaleChange(nextLocale: string) {
    if (nextLocale === activeLocale || isSwitchingLocale) return
    // Nothing saved yet — no other-language content to fetch, just switch
    // which language new autosaves/Publish will write to.
    if (!docIdRef.current) {
      setActiveLocale(nextLocale)
      return
    }
    setIsSwitchingLocale(true)
    try {
      // Autosave the in-progress draft in the CURRENT language before
      // switching away, so edits made just before clicking aren't lost.
      await persist("draft", formValues)
      const result = await getContentPage(docIdRef.current, nextLocale)
      if (!result.success) throw new Error(result.error)
      applyDoc(result.data)
      setActiveLocale(nextLocale)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch language")
    } finally {
      setIsSwitchingLocale(false)
    }
  }

  function addBlock(blockType: string) {
    setLayout((prev) => {
      justAddedIndexRef.current = prev.length
      return [...prev, { blockType }]
    })
  }

  async function loadVersions() {
    if (!docIdRef.current) return
    setIsLoadingVersions(true)
    try {
      const result = await getContentPageVersions(docIdRef.current, activeLocale)
      if (result.success) setVersions(result.data)
      else toast.error(result.error)
    } finally {
      setIsLoadingVersions(false)
    }
  }

  // Rewrites the live doc back to a past version, then reloads the form
  // the same way switching locale already does (applyDoc) — no separate
  // "preview before restoring" step, matching Payload's own admin behavior.
  async function handleRestoreVersion(version: PayloadPageVersion) {
    if (!confirm(`Restore this page to its version from ${new Date(version.updatedAt).toLocaleString()}? This replaces the current content.`)) return
    setRestoringVersionId(version.id)
    try {
      const result = await restoreContentPageVersion(version.id, activeLocale)
      if (!result.success) throw new Error(result.error)
      applyDoc(result.data)
      toast.success("Version restored")
      await loadVersions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore version")
    } finally {
      setRestoringVersionId(null)
    }
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

  // Shared by autosave (status: "draft", fired on every edit) and Publish
  // (status: "published", explicit button click) — the only difference
  // between the two is `_status`; the bridge (payload-bridge.ts) turns that
  // into Payload's own `draft=true` write flag, which is what keeps a
  // currently-published page live while a draft autosaves in the
  // background (see payload-cms's sync/dispatch.ts `isDraftOnlySave`).
  async function persist(status: "draft" | "published", values: PageFormValues): Promise<PayloadPageDoc> {
    // JSON round-trip strips `undefined` values from nested block objects
    // (e.g. a freshly-added repeatable item's not-yet-filled fields) —
    // cheap insurance against a Server Action serialization edge case.
    const sanitizedLayout = JSON.parse(JSON.stringify(values.layout))
    const result = await saveContentPage(
      docIdRef.current,
      {
        title: values.title,
        slug: values.slug,
        pageType: values.pageType || undefined,
        category: values.categoryId || null,
        parent: values.parentId || null,
        layout: sanitizedLayout,
        seo: {
          metaTitle: values.metaTitle || undefined,
          metaDescription: values.metaDescription || undefined,
          image: values.headerImage || null,
          noIndex: values.noIndex,
          noFollow: values.noFollow,
        },
        includeSiteNameInTitle: values.includeSiteNameInTitle,
        scheduledPublishAt: localInputToIso(values.scheduledPublishAt) ?? null,
        scheduledUnpublishAt: localInputToIso(values.scheduledUnpublishAt) ?? null,
        homeForLocale: values.homeForLocale,
        _status: status,
      },
      activeLocale,
    )
    if (!result.success) throw new Error(result.error)
    docIdRef.current = result.data.id
    setDocStatus(result.data._status)
    setDocPath(result.data.path)
    setDocPublishedAt(result.data.publishedAt)
    return result.data
  }

  const formValues: PageFormValues = {
    title,
    slug,
    pageType,
    categoryId,
    parentId,
    metaTitle,
    metaDescription,
    headerImage,
    noIndex,
    noFollow,
    includeSiteNameInTitle,
    scheduledPublishAt,
    scheduledUnpublishAt,
    homeForLocale,
    layout,
  }

  const autosave = useAutosave(formValues, (values) => persist("draft", values).then(() => undefined))

  async function handlePublish() {
    // A page with zero blocks publishes "successfully" (no error, no
    // syncStatus failure) but has nothing to render — 404s on the live
    // site with no indication why (Charles, 2026-07-08, mistook this for
    // a 500). Catching it here, before the request, beats a confusing
    // silent no-op after.
    if (layout.length === 0) {
      toast.error("Add at least one block before publishing — a published page with no blocks shows nothing on the site.")
      return
    }
    setIsPublishing(true)
    try {
      await persist("published", formValues)
      toast.success("Page published")
      if (onSaved) {
        onSaved()
      } else {
        router.push("/admin/pages")
        router.refresh()
      }
    } catch (error) {
      console.error("handlePublish threw before reaching the server:", error)
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">{title || "New page"}</h2>
          <div className="flex items-center gap-2">
            {isSwitchingLocale && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <Select value={activeLocale} onValueChange={handleLocaleChange} disabled={isSwitchingLocale}>
              <SelectTrigger className="h-8 w-[150px] gap-1">
                <Globe className="h-3 w-3 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs
          defaultValue="content"
          onValueChange={(tab) => {
            if (tab === "settings" && !versionsLoadedRef.current) {
              versionsLoadedRef.current = true
              void loadVersions()
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="flex flex-col gap-6">
            <Card shadow="flat" className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle>Page information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page-title">Title</Label>
                  <Input id="page-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-slug">Slug</Label>
                  <Input id="page-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for the home page (path &quot;/&quot;) — required for every other page.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Blocks</h3>
              <BlockPickerDialog onSelect={addBlock} />
            </div>

            <div className="flex flex-col gap-4">
              {layout.map((block, index) => (
                <div
                  key={block.id ?? index}
                  ref={
                    index === justAddedIndexRef.current
                      ? (el) => {
                          if (!el) return
                          el.scrollIntoView({ behavior: "smooth", block: "center" })
                          justAddedIndexRef.current = null
                        }
                      : undefined
                  }
                >
                  <BlockEditor
                    block={block}
                    onChange={(next) => updateBlock(index, next)}
                    onRemove={() => removeBlock(index)}
                    onMoveUp={() => moveBlock(index, -1)}
                    onMoveDown={() => moveBlock(index, 1)}
                    canMoveUp={index > 0}
                    canMoveDown={index < layout.length - 1}
                    defaultExpanded={index >= initialBlockCountRef.current}
                  />
                </div>
              ))}
            </div>

            {docIdRef.current && (
              <p className="text-xs text-muted-foreground">
                Final path: <span className="font-mono">{docPath || (slug ? `/${slug}` : "/")}</span>
                {docStatus === "published" ? (
                  <>
                    {" — "}
                    <a href={docPath} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      View live
                    </a>
                  </>
                ) : (
                  " — Draft: not visible on the site until published."
                )}
              </p>
            )}
          </TabsContent>

          <TabsContent value="seo">
            <Card shadow="flat" className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta-title">Meta title (SEO)</Label>
                  <Input id="meta-title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
                  <SeoLengthIndicator text={metaTitle} minLength={50} maxLength={60} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-description">Meta description (SEO)</Label>
                  <Input
                    id="meta-description"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                  />
                  <SeoLengthIndicator text={metaDescription} minLength={100} maxLength={150} />
                </div>
                <div className="space-y-2">
                  <Label>Header image</Label>
                  {/* Charles (2026-07-11): "on doit pouvoir intégrer cet
                      élément qui apparaîtra sur les SERP" — single shared
                      field, feeds og:image/Twitter Card AND the banner
                      rendered above the page's blocks on the public site. */}
                  <MediaPickerField name="headerImage" kind="image" value={headerImage} onChange={setHeaderImage} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="include-site-name" checked={includeSiteNameInTitle} onCheckedChange={setIncludeSiteNameInTitle} />
                  <Label htmlFor="include-site-name" className="font-normal">
                    Include site name in title (e.g. &quot;Page title | Site name&quot;)
                  </Label>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="no-index" checked={noIndex} onCheckedChange={setNoIndex} />
                    <Label htmlFor="no-index" className="font-normal">
                      Do not index (noindex)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="no-follow" checked={noFollow} onCheckedChange={setNoFollow} />
                    <Label htmlFor="no-follow" className="font-normal">
                      Do not follow links (nofollow)
                    </Label>
                  </div>
                </div>
                {/* Payload's plugin-seo has a real preview panel; neosaas-v2's
                    own editor had none even though this SEO data now actually
                    drives generateMetadata() on the live site (2026-07-08) —
                    same "content going live with no visual feedback" pattern
                    as the empty-blocks warning added earlier today. */}
                <div className="space-y-1.5 rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground">Google preview</p>
                  <p className="truncate text-sm text-[#1a0dab]">
                    {metaTitle || title || "Page title"}
                    {includeSiteNameInTitle && " | Site name"}
                  </p>
                  <p className="truncate text-xs text-[#006621]">
                    {docPath || slug ? `neosaas.tech/${activeLocale}${docPath || `/${slug}`}` : "neosaas.tech"}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {metaDescription || "No description — the site will use its default description."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card shadow="flat" className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page-type">Page type</Label>
                  <Select value={pageType || "landing"} onValueChange={setPageType}>
                    <SelectTrigger id="page-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landing">Page</SelectItem>
                      <SelectItem value="article">Article (blog)</SelectItem>
                      <SelectItem value="documentation">Documentation (wiki)</SelectItem>
                    </SelectContent>
                  </Select>
                  {pageType === "documentation" && (
                    <p className="text-xs text-muted-foreground">
                      Shows up in the /documentation wiki sidebar. Set a Parent page below to place it in the hierarchy.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-home-for-locale">Home page for this language</Label>
                  <Select
                    value={homeForLocale || "none"}
                    onValueChange={(v) => setHomeForLocale(v === "none" ? "" : (v as "fr" | "en"))}
                  >
                    <SelectTrigger id="page-home-for-locale">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not a home page</SelectItem>
                      <SelectItem value="fr">🇫🇷 Home page for Français</SelectItem>
                      <SelectItem value="en">🇬🇧 Home page for English</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Makes this page appear at &quot;/{homeForLocale || activeLocale}&quot; instead of its own path when a
                    visitor is on that language. Only one page per language can be the home page — saving will fail
                    with an error if another page already claims it.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-category">Category</Label>
                  <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                    <SelectTrigger id="page-category">
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.path || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-parent">Parent page</Label>
                  <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
                    <SelectTrigger id="page-parent">
                      <SelectValue placeholder="No parent (top-level page)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent (top-level page)</SelectItem>
                      {pages
                        .filter((p) => String(p.id) !== String(docIdRef.current ?? ""))
                        .map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.title} — {p.path}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Determines this page&apos;s URL hierarchy (e.g. a child of &quot;Documentation&quot; becomes
                    /documentation/child-slug).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card shadow="flat" className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle>Publication</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Page ID</Label>
                    <p className="font-mono text-sm">{docIdRef.current ?? "— (not saved yet)"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Published date</Label>
                    <p className="text-sm">
                      {docPublishedAt
                        ? new Date(docPublishedAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Not published yet"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-publish-at">Schedule publish</Label>
                    <Input
                      id="scheduled-publish-at"
                      type="datetime-local"
                      value={scheduledPublishAt}
                      onChange={(e) => setScheduledPublishAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-unpublish-at">Schedule unpublish</Label>
                    <Input
                      id="scheduled-unpublish-at"
                      type="datetime-local"
                      value={scheduledUnpublishAt}
                      onChange={(e) => setScheduledUnpublishAt(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card shadow="flat" className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle>Version history</CardTitle>
              </CardHeader>
              <CardContent>
                {!docIdRef.current ? (
                  <p className="text-sm text-muted-foreground">Save the page at least once to see its version history.</p>
                ) : isLoadingVersions ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading version history…
                  </p>
                ) : versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No versions found.</p>
                ) : (
                  <div className="flex flex-col divide-y">
                    {versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{version.version.title || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(version.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                            {version.version._status && ` — ${version.version._status}`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={restoringVersionId !== null}
                          onClick={() => handleRestoreVersion(version)}
                        >
                          {restoringVersionId === version.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restore"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3">
          <Button type="button" disabled={isPublishing} onClick={handlePublish}>
            Publish
          </Button>
          <span className="text-xs text-muted-foreground">
            {autosave.status === "saving" && "Saving…"}
            {autosave.status === "saved" && "All changes saved"}
            {autosave.status === "error" && `Autosave failed: ${autosave.error}`}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <TemplateVariablesHint />
        <h3 className="text-sm font-medium">Live preview</h3>
        <ResponsivePreviewFrame>
          <div className="rounded-lg border-2 border-dashed bg-background p-6">
            {layout.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">Add a block to see the preview.</p>
            ) : (
              <div className="flex flex-col">
                {layout.map((block, index) => (
                  <BlockPreview key={block.id ?? index} block={block} />
                ))}
              </div>
            )}
          </div>
        </ResponsivePreviewFrame>
      </div>
    </div>
  )
}
