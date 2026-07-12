"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { saveContentArticle, getContentCategories } from "@/app/actions/pages"
import type { PayloadBlogPostDoc, PayloadCategorySummary } from "@/lib/payload-bridge"
import { RichTextEditor, RichTextPreview } from "@/components/admin/content/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Globe } from "lucide-react"
import { SeoLengthIndicator } from "./seo-length-indicator"
import { MediaPickerField } from "./media-picker-field"
import { useAutosave } from "./use-autosave"

const LOCALE_LABELS: Record<string, string> = { fr: "Français", en: "English" }

interface ArticleFormValues {
  title: string
  slug: string
  categoryId: string
  excerpt: string
  body: unknown
  metaTitle: string
  metaDescription: string
  coverImage: string
  noIndex: boolean
  noFollow: boolean
  includeSiteNameInTitle: boolean
  scheduledPublishAt: string
  scheduledUnpublishAt: string
}

// See page-editor.tsx for the full rationale — same conversion, kept in
// sync between both editors.
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

export function ArticleEditor({
  article,
  locale = "fr",
  onSaved,
}: {
  article: PayloadBlogPostDoc | null
  locale?: string
  onSaved?: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(article?.title ?? "")
  const [slug, setSlug] = useState(article?.slug ?? "")
  const [categoryId, setCategoryId] = useState(article?.category ? String(article.category) : "")
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "")
  const [body, setBody] = useState<unknown>(article?.body ?? undefined)
  const [metaTitle, setMetaTitle] = useState(article?.seo?.metaTitle ?? "")
  const [metaDescription, setMetaDescription] = useState(article?.seo?.metaDescription ?? "")
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? "")
  const [noIndex, setNoIndex] = useState(article?.seo?.noIndex ?? false)
  const [noFollow, setNoFollow] = useState(article?.seo?.noFollow ?? false)
  const [scheduledPublishAt, setScheduledPublishAt] = useState(isoToLocalInput(article?.scheduledPublishAt))
  const [scheduledUnpublishAt, setScheduledUnpublishAt] = useState(isoToLocalInput(article?.scheduledUnpublishAt))
  const [includeSiteNameInTitle, setIncludeSiteNameInTitle] = useState(article?.includeSiteNameInTitle ?? true)
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [docPublishedAt, setDocPublishedAt] = useState(article?.publishedAt)
  // Ref, not state: an autosave-triggered create must be visible to the
  // very next debounced tick immediately, before React re-renders, or two
  // rapid edits on a brand new article would each create a separate doc.
  const docIdRef = useRef<string | number | null>(article?.id ?? null)

  // Charles (2026-07-09): "pendant l'édition des articles/posts, les meta
  // s'inscrivent automatiquement en asynchrone." Same rule Payload already
  // applies server-side (autoFillMetaTitle/autoFillMetaDescription,
  // src/utils/autoSeoMeta.ts) — only fills an EMPTY meta field, so a
  // manually-typed value is never overwritten; once the field has any
  // content it stops following title/excerpt. Debounced so a fast typer
  // doesn't churn two extra state updates per keystroke.
  useEffect(() => {
    if (metaTitle) return
    const timer = setTimeout(() => {
      if (!metaTitle && title) setMetaTitle(title)
    }, 500)
    return () => clearTimeout(timer)
  }, [title, metaTitle])

  useEffect(() => {
    if (metaDescription) return
    const timer = setTimeout(() => {
      if (!metaDescription && excerpt) setMetaDescription(excerpt)
    }, 500)
    return () => clearTimeout(timer)
  }, [excerpt, metaDescription])

  useEffect(() => {
    getContentCategories(locale).then((result) => {
      if (result.success) setCategories(result.data)
    })
  }, [locale])

  // Shared by autosave (status: "draft", fired on every edit) and Publish
  // (status: "published", explicit button click) — see page-editor.tsx's
  // `persist` for why `_status` is the only thing that differs and how the
  // bridge (payload-bridge.ts) turns it into Payload's safe `draft=true`
  // write, which keeps an already-published article live while a draft
  // autosaves in the background.
  async function persist(status: "draft" | "published", values: ArticleFormValues): Promise<PayloadBlogPostDoc> {
    const result = await saveContentArticle(
      docIdRef.current,
      {
        title: values.title,
        slug: values.slug,
        category: values.categoryId || undefined,
        excerpt: values.excerpt || undefined,
        body: values.body,
        seo: {
          metaTitle: values.metaTitle || undefined,
          metaDescription: values.metaDescription || undefined,
          noIndex: values.noIndex,
          noFollow: values.noFollow,
        },
        // This collection's header/SEO image — Payload's `coverImage` field,
        // not plugin-seo's meta.image (see payload-bridge.ts).
        coverImage: values.coverImage || null,
        includeSiteNameInTitle: values.includeSiteNameInTitle,
        scheduledPublishAt: localInputToIso(values.scheduledPublishAt) ?? null,
        scheduledUnpublishAt: localInputToIso(values.scheduledUnpublishAt) ?? null,
        _status: status,
      },
      locale,
    )
    if (!result.success) throw new Error(result.error)
    docIdRef.current = result.data.id
    setDocPublishedAt(result.data.publishedAt)
    return result.data
  }

  const formValues: ArticleFormValues = {
    title,
    slug,
    categoryId,
    excerpt,
    body,
    metaTitle,
    metaDescription,
    coverImage,
    noIndex,
    noFollow,
    includeSiteNameInTitle,
    scheduledPublishAt,
    scheduledUnpublishAt,
  }

  const autosave = useAutosave(formValues, (values) => persist("draft", values).then(() => undefined))

  async function handlePublish() {
    setIsPublishing(true)
    try {
      await persist("published", formValues)
      toast.success("Article published")
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
          <h2 className="text-sm font-medium text-muted-foreground">{title || "New article"}</h2>
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

          <TabsContent value="content">
            <Card shadow="flat" className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle>Article information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="article-title">Title</Label>
                  <Input id="article-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="article-slug">Slug</Label>
                  <Input id="article-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="article-excerpt">Excerpt</Label>
                  <Textarea id="article-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <RichTextEditor initialValue={article?.body} onChange={setBody} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo">
            <Card shadow="flat" className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="article-meta-title">Meta title (SEO)</Label>
                  <Input id="article-meta-title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
                  <SeoLengthIndicator text={metaTitle} minLength={50} maxLength={60} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="article-meta-description">Meta description (SEO)</Label>
                  <Input
                    id="article-meta-description"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                  />
                  <SeoLengthIndicator text={metaDescription} minLength={100} maxLength={150} />
                </div>
                <div className="space-y-2">
                  <Label>Header image</Label>
                  {/* Charles (2026-07-11): shared field — feeds og:image/
                      Twitter Card AND the banner already rendered above the
                      article body on the public site (blog/[slug]/page.tsx),
                      which previously had no UI control to set it at all. */}
                  <MediaPickerField name="coverImage" kind="image" value={coverImage} onChange={setCoverImage} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="article-include-site-name" checked={includeSiteNameInTitle} onCheckedChange={setIncludeSiteNameInTitle} />
                  <Label htmlFor="article-include-site-name" className="font-normal">
                    Include site name in title (e.g. &quot;Article title | Site name&quot;)
                  </Label>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="article-no-index" checked={noIndex} onCheckedChange={setNoIndex} />
                    <Label htmlFor="article-no-index" className="font-normal">
                      Do not index (noindex)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="article-no-follow" checked={noFollow} onCheckedChange={setNoFollow} />
                    <Label htmlFor="article-no-follow" className="font-normal">
                      Do not follow links (nofollow)
                    </Label>
                  </div>
                </div>
                <div className="space-y-1.5 rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground">Google preview</p>
                  <p className="truncate text-sm text-[#1a0dab]">
                    {metaTitle || title || "Article title"}
                    {includeSiteNameInTitle && " | Site name"}
                  </p>
                  <p className="truncate text-xs text-[#006621]">{slug ? `neosaas.tech/${locale}/blog/${slug}` : "neosaas.tech/blog"}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {metaDescription || excerpt || "No description — the site will use the excerpt or the default description."}
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
                  <Label htmlFor="article-category">Category</Label>
                  <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                    <SelectTrigger id="article-category">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.path || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Label className="text-muted-foreground">Article ID</Label>
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
                    <Label htmlFor="article-scheduled-publish-at">Schedule publish</Label>
                    <Input
                      id="article-scheduled-publish-at"
                      type="datetime-local"
                      value={scheduledPublishAt}
                      onChange={(e) => setScheduledPublishAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="article-scheduled-unpublish-at">Schedule unpublish</Label>
                    <Input
                      id="article-scheduled-unpublish-at"
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
        <h3 className="text-sm font-medium">Preview</h3>
        <div className="rounded-lg border-2 border-dashed bg-background p-6">
          <h1 className="text-2xl font-bold">{title || "Article title"}</h1>
          {excerpt && <p className="mt-2 text-muted-foreground">{excerpt}</p>}
          <div className="mt-4">
            <RichTextPreview value={body} />
          </div>
        </div>
      </div>
    </div>
  )
}
