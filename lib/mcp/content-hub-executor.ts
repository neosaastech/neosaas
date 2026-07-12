import { createBlogPost, createPage, type BlogPostWriteInput, type PageWriteInput } from "@/lib/payload-bridge"

export async function publishContentPageToPayload(
  input: PageWriteInput,
  locale: string,
): Promise<{ id: string | number; path: string; status: PageWriteInput["_status"] }> {
  const doc = await createPage(input, locale)
  return {
    id: doc.id,
    path: doc.path,
    status: doc._status,
  }
}

export async function publishContentArticleToPayload(
  input: BlogPostWriteInput,
  locale: string,
): Promise<{ id: string | number; slug: string; status: BlogPostWriteInput["_status"] }> {
  const doc = await createBlogPost(input, locale)
  return {
    id: doc.id,
    slug: doc.slug,
    status: doc._status,
  }
}
