"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { saveContentPage, getContentCategories, getContentPages } from "@/app/actions/pages"
import type { PayloadPageDoc, PayloadPageBlock, PayloadCategorySummary, PayloadPageSummary } from "@/lib/payload-bridge"
import { BlockEditor } from "./block-editor"
import { BlockPickerDialog } from "./block-picker-dialog"
import { BlockPreview } from "./block-preview"
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

const LOCALE_LABELS: Record<string, string> = { fr: "Français", en: "English" }

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

  useEffect(() => {
    getContentCategories().then((result) => {
      if (result.success) setCategories(result.data)
    })
    getContentPages({ limit: 200 }).then((result) => {
      if (result.success) setPages(result.data.docs)
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
        _status: status,
      },
      locale,
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
          <Badge variant="outline" className="gap-1">
            <Globe className="h-3 w-3" />
            {LOCALE_LABELS[locale] ?? locale}
          </Badge>
        </div>

        <Tabs defaultValue="content">
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
                <BlockEditor
                  key={block.id ?? index}
                  block={block}
                  onChange={(next) => updateBlock(index, next)}
                  onRemove={() => removeBlock(index)}
                  onMoveUp={() => moveBlock(index, -1)}
                  onMoveDown={() => moveBlock(index, 1)}
                  canMoveUp={index > 0}
                  canMoveDown={index < layout.length - 1}
                  defaultExpanded={index >= initialBlockCountRef.current}
                />
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
                    {docPath || slug ? `neosaas.tech/${locale}${docPath || `/${slug}`}` : "neosaas.tech"}
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
      </div>
    </div>
  )
}
