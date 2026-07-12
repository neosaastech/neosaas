import { z } from "zod"
import type { BlogPostWriteInput } from "@/lib/payload-bridge"

export const blogPostWriteInputSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  category: z.union([z.string(), z.number(), z.null()]).optional(),
  excerpt: z.string().optional(),
  body: z.unknown().optional(),
  publishedAt: z.string().nullable().optional(),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    })
    .optional(),
  includeSiteNameInTitle: z.boolean().optional(),
  _status: z.enum(["draft", "published"]),
})

export interface ContentArticlePlan {
  input: BlogPostWriteInput
  locale: string
  validation: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

/** Minimal Payload Lexical JSON — same shape as RichTextEditor `state.toJSON()`. */
export function lexicalParagraphBody(text: string): unknown {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: null,
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: null,
          children: [
            {
              type: "text",
              format: 0,
              detail: 0,
              mode: "normal",
              style: "",
              text,
              version: 1,
            },
          ],
        },
      ],
    },
  }
}

export function validateContentHubArticleInput(
  input: BlogPostWriteInput,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  const parsed = blogPostWriteInputSchema.safeParse(input)
  if (!parsed.success) {
    errors.push(parsed.error.message)
    return { valid: false, errors, warnings }
  }

  if (input._status === "published" && !input.body) {
    warnings.push("Published article has no body — same as ArticleEditor (allowed but may render empty)")
  }

  if (!input.excerpt && input.title) {
    warnings.push("No excerpt — SEO preview may fall back to body or default description")
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Propose a BlogPostWriteInput using the same content model as `ArticleEditor`
 * (`components/admin/content/article-editor.tsx`).
 */
export function proposeContentArticleFromIntent(input: {
  intent: string
  title?: string
  slug?: string
  locale?: string
  status?: "draft" | "published"
}): ContentArticlePlan {
  const title = input.title ?? input.intent.replace(/\.$/, "").slice(0, 80)
  const slug = input.slug ?? slugify(title)
  const excerpt = `Learn more about ${title}.`

  const articleInput: BlogPostWriteInput = {
    title,
    slug,
    category: null,
    excerpt,
    body: lexicalParagraphBody(input.intent),
    seo: {
      metaTitle: title,
      metaDescription: excerpt,
    },
    includeSiteNameInTitle: true,
    _status: input.status ?? "draft",
  }

  const validation = validateContentHubArticleInput(articleInput)

  return {
    input: articleInput,
    locale: input.locale ?? "en",
    validation,
  }
}

/** Mirrors `ArticleEditor.handleSave` payload shape before `saveContentArticle`. */
export function planContentArticleSave(input: {
  article: BlogPostWriteInput
  locale?: string
}): ContentArticlePlan {
  const sanitized = JSON.parse(JSON.stringify(input.article)) as BlogPostWriteInput
  const validation = validateContentHubArticleInput(sanitized)

  return {
    input: sanitized,
    locale: input.locale ?? "en",
    validation,
  }
}
