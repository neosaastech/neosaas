'use server'

import { db } from "@/db"
import { pagePermissions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { RequiredRoleLevel } from "@/lib/auth/page-access"
import { getCurrentUser } from "@/lib/auth"
import {
  listPages,
  getPage,
  createPage,
  updatePage,
  listBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  listCategories,
  type PayloadPageSummary,
  type PayloadPageDoc,
  type PageWriteInput,
  type PayloadBlogPostSummary,
  type PayloadBlogPostDoc,
  type BlogPostWriteInput,
  type PayloadCategorySummary,
  type PaginatedResult,
  type ListPagesOptions,
  type ListBlogPostsOptions,
} from "@/lib/payload-bridge"

// Was its own "public" | "user" | "admin" | "super-admin" (hyphen) union,
// never matching the "super_admin" (underscore) string actually used by
// every consumer (components/admin/pages-settings.tsx, db/schema.ts,
// lib/pilot/actions.ts) — reusing the canonical type kills that drift at
// the source instead of fixing the typo in two places that can re-diverge.
export type AccessLevel = RequiredRoleLevel

export async function getPages() {
  try {
    const pages = await db.select().from(pagePermissions).orderBy(pagePermissions.path)
    return { success: true, data: pages }
  } catch (error) {
    console.error("Failed to fetch pages:", error)
    return { success: false, error: "Failed to fetch pages" }
  }
}

export async function updatePageAccess(path: string, access: AccessLevel) {
  try {
    await db.update(pagePermissions)
      .set({ access, updatedAt: new Date() })
      .where(eq(pagePermissions.path, path))
    
    revalidatePath("/admin/pages")
    return { success: true, message: "Page access updated successfully" }
  } catch (error) {
    console.error("Failed to update page access:", error)
    return { success: false, error: "Failed to update page access" }
  }
}

export async function syncPages(pages: { path: string, name: string, group: string, access: AccessLevel }[]) {
  try {
    for (const page of pages) {
      await db.insert(pagePermissions)
        .values({
          path: page.path,
          name: page.name,
          group: page.group,
          access: page.access
        })
        .onConflictDoNothing({ target: pagePermissions.path })
    }
    revalidatePath("/admin/pages")
    return { success: true, message: "Pages synced successfully" }
  } catch (error) {
    console.error("Failed to sync pages:", error)
    return { success: false, error: "Failed to sync pages" }
  }
}

/**
 * Content-management bridge (Notion "Payload CMS multi-site" — 2026-07-04):
 * real content pages authored in the central Payload, read AND written
 * through the server-side bridge (lib/payload-bridge.ts) — this app never
 * writes page_layers directly for this content, Payload's own sync hooks
 * remain the only path that populates it. All writes gated to admin/
 * super_admin, matching the pattern already used across app/actions/*.ts.
 */
export async function getContentPages(
  options: ListPagesOptions = {},
): Promise<
  { success: true; data: PaginatedResult<PayloadPageSummary> } | { success: false; error: string }
> {
  try {
    const pages = await listPages(options)
    return { success: true, data: pages }
  } catch (error) {
    console.error("Failed to fetch content pages from Payload:", error)
    return { success: false, error: "Failed to fetch content pages" }
  }
}

export async function getContentPage(
  id: string | number,
): Promise<{ success: true; data: PayloadPageDoc } | { success: false; error: string }> {
  try {
    const page = await getPage(id)
    return { success: true, data: page }
  } catch (error) {
    console.error("Failed to fetch content page from Payload:", error)
    return { success: false, error: "Failed to fetch content page" }
  }
}

export async function saveContentPage(
  id: string | number | null,
  input: PageWriteInput,
): Promise<{ success: true; data: PayloadPageDoc } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const page = id ? await updatePage(id, input) : await createPage(input)
    revalidatePath("/admin/pages")
    return { success: true, data: page }
  } catch (error) {
    console.error("Failed to save content page to Payload:", error)
    // Was collapsing every failure into "Failed to save content page" —
    // swallowed the real Payload validation error (e.g. a duplicate slug,
    // a missing required field), making a genuine save failure impossible
    // to tell apart from a working save whose result just wasn't visible.
    const message = error instanceof Error ? error.message : "Failed to save content page"
    return { success: false, error: message }
  }
}

// ─── Articles (BlogPosts) — same content-hub gating pattern as Pages above ───

export async function getContentArticles(
  options: ListBlogPostsOptions = {},
): Promise<
  { success: true; data: PaginatedResult<PayloadBlogPostSummary> } | { success: false; error: string }
> {
  try {
    const articles = await listBlogPosts(options)
    return { success: true, data: articles }
  } catch (error) {
    console.error("Failed to fetch content articles from Payload:", error)
    return { success: false, error: "Failed to fetch content articles" }
  }
}

export async function getContentArticle(
  id: string | number,
): Promise<{ success: true; data: PayloadBlogPostDoc } | { success: false; error: string }> {
  try {
    const article = await getBlogPost(id)
    return { success: true, data: article }
  } catch (error) {
    console.error("Failed to fetch content article from Payload:", error)
    return { success: false, error: "Failed to fetch content article" }
  }
}

export async function saveContentArticle(
  id: string | number | null,
  input: BlogPostWriteInput,
): Promise<{ success: true; data: PayloadBlogPostDoc } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const article = id ? await updateBlogPost(id, input) : await createBlogPost(input)
    revalidatePath("/admin/pages")
    return { success: true, data: article }
  } catch (error) {
    console.error("Failed to save content article to Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to save content article"
    return { success: false, error: message }
  }
}

export async function getContentCategories(): Promise<
  { success: true; data: PayloadCategorySummary[] } | { success: false; error: string }
> {
  try {
    const categories = await listCategories()
    return { success: true, data: categories }
  } catch (error) {
    console.error("Failed to fetch categories from Payload:", error)
    return { success: false, error: "Failed to fetch categories" }
  }
}
