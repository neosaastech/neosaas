"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { saveContentArticle, getContentCategories } from "@/app/actions/pages"
import type { PayloadBlogPostDoc, PayloadCategorySummary } from "@/lib/payload-bridge"
import { RichTextEditor, RichTextPreview } from "@/components/admin/content/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Globe } from "lucide-react"

const LOCALE_LABELS: Record<string, string> = { fr: "Français", en: "English" }

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
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getContentCategories(locale).then((result) => {
      if (result.success) setCategories(result.data)
    })
  }, [locale])

  async function handleSave(status: "draft" | "published") {
    setIsSaving(true)
    try {
      const result = await saveContentArticle(
        article?.id ?? null,
        {
          title,
          slug,
          category: categoryId || undefined,
          excerpt: excerpt || undefined,
          body,
          seo: { metaTitle: metaTitle || undefined, metaDescription: metaDescription || undefined },
          _status: status,
        },
        locale,
      )
      if (result.success) {
        toast.success(status === "published" ? "Article publié" : "Brouillon enregistré")
        if (onSaved) {
          onSaved()
        } else {
          router.push("/admin/pages")
          router.refresh()
        }
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error("handleSave threw before reaching the server:", error)
      toast.error(error instanceof Error ? error.message : "Une erreur inattendue est survenue")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Card shadow="flat">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Informations de l&apos;article</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Globe className="h-3 w-3" />
              {LOCALE_LABELS[locale] ?? locale}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="article-title">Titre</Label>
              <Input id="article-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-slug">Slug</Label>
              <Input id="article-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-category">Catégorie</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger id="article-category">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.path || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-excerpt">Extrait</Label>
              <Textarea id="article-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Contenu</Label>
              <RichTextEditor initialValue={article?.body} onChange={setBody} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-meta-title">Meta title (SEO)</Label>
              <Input id="article-meta-title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-meta-description">Meta description (SEO)</Label>
              <Input
                id="article-meta-description"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">Aperçu Google</p>
              <p className="truncate text-sm text-[#1a0dab]">{metaTitle || title || "Titre de l'article"}</p>
              <p className="truncate text-xs text-[#006621]">{slug ? `neosaas.tech/${locale}/blog/${slug}` : "neosaas.tech/blog"}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {metaDescription || excerpt || "Aucune description — le site utilisera l'extrait ou la description par défaut."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" disabled={isSaving} onClick={() => handleSave("draft")}>
            Enregistrer le brouillon
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => handleSave("published")}>
            Publier
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">Aperçu</h3>
        <div className="rounded-lg border bg-background p-6">
          <h1 className="text-2xl font-bold">{title || "Titre de l'article"}</h1>
          {excerpt && <p className="mt-2 text-muted-foreground">{excerpt}</p>}
          <div className="mt-4">
            <RichTextPreview value={body} />
          </div>
        </div>
      </div>
    </div>
  )
}
