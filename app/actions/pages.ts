'use server'

import { db } from "@/db"
import { pageLayers, pagePermissions } from "@/db/schema"
import { and, asc, eq } from "drizzle-orm"
import { buildHomeLayers } from "@/lib/pages/home-content"
import { isOfflineDev } from "@/lib/dev/offline-mode"
import { revalidatePath } from "next/cache"
import type { RequiredRoleLevel } from "@/lib/auth/page-access"
import { getCurrentUser } from "@/lib/auth"
import {
  listPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  listBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type PayloadPageSummary,
  type PayloadPageDoc,
  type PageWriteInput,
  type PayloadBlogPostSummary,
  type PayloadBlogPostDoc,
  type BlogPostWriteInput,
  type PayloadCategorySummary,
  type CategoryWriteInput,
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
  locale: string = "fr",
): Promise<{ success: true; data: PayloadPageDoc } | { success: false; error: string }> {
  try {
    const page = await getPage(id, locale)
    return { success: true, data: page }
  } catch (error) {
    console.error("Failed to fetch content page from Payload:", error)
    return { success: false, error: "Failed to fetch content page" }
  }
}

export async function saveContentPage(
  id: string | number | null,
  input: PageWriteInput,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadPageDoc } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const page = id ? await updatePage(id, input, locale) : await createPage(input, locale)
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

/**
 * Content Hub had no way to delete a Page at all until now (2026-07-08,
 * Charles) — only Payload's own separate admin did, which editors don't
 * know to use. Deleting a published page fires payload-cms's
 * syncPageAfterDelete first (deactivates the target site's copy), so by the
 * time this resolves the content is already gone from the live site too.
 */
export async function removeContentPage(id: string | number): Promise<{ success: true } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await deletePage(id)
    revalidatePath("/admin/pages")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete content page from Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to delete content page"
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
  locale: string = "fr",
): Promise<{ success: true; data: PayloadBlogPostDoc } | { success: false; error: string }> {
  try {
    const article = await getBlogPost(id, locale)
    return { success: true, data: article }
  } catch (error) {
    console.error("Failed to fetch content article from Payload:", error)
    return { success: false, error: "Failed to fetch content article" }
  }
}

export async function saveContentArticle(
  id: string | number | null,
  input: BlogPostWriteInput,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadBlogPostDoc } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const article = id ? await updateBlogPost(id, input, locale) : await createBlogPost(input, locale)
    revalidatePath("/admin/pages")
    return { success: true, data: article }
  } catch (error) {
    console.error("Failed to save content article to Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to save content article"
    return { success: false, error: message }
  }
}

/** Same rationale as removeContentPage — Content Hub had no delete for Articles either. */
export async function removeContentArticle(id: string | number): Promise<{ success: true } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await deleteBlogPost(id)
    revalidatePath("/admin/pages")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete content article from Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to delete content article"
    return { success: false, error: message }
  }
}

export async function getContentCategories(locale: string = "fr"): Promise<
  { success: true; data: PayloadCategorySummary[] } | { success: false; error: string }
> {
  try {
    const categories = await listCategories(locale)
    return { success: true, data: categories }
  } catch (error) {
    console.error("Failed to fetch categories from Payload:", error)
    return { success: false, error: "Failed to fetch categories" }
  }
}

// ─── Categories (shared taxonomy for Pages and Articles) ───

export async function saveCategory(
  id: string | number | null,
  input: CategoryWriteInput,
): Promise<{ success: true; data: PayloadCategorySummary } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const category = id ? await updateCategory(id, input) : await createCategory(input)
    revalidatePath("/admin/pages")
    return { success: true, data: category }
  } catch (error) {
    console.error("Failed to save category to Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to save category"
    return { success: false, error: message }
  }
}

/** Page layers for Puck builder — falls back to buildHomeLayers() when DB is empty on /. */
export async function getPageLayers(pagePath: string, locale: string = "fr") {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false as const, error: "Unauthorized" }
  }

  if (isOfflineDev()) {
    if (pagePath === "/") {
      const rows = buildHomeLayers(locale).map((layer) => ({
        layerType: layer.layerType,
        position: layer.position,
        props: layer.props as Record<string, unknown>,
      }))
      return { success: true as const, data: rows }
    }
    return { success: true as const, data: [] }
  }

  try {
    const layers = await db.query.pageLayers.findMany({
      where: and(eq(pageLayers.pagePath, pagePath), eq(pageLayers.locale, locale)),
      orderBy: asc(pageLayers.position),
    })
    if (layers.length === 0 && pagePath === "/") {
      const rows = buildHomeLayers(locale).map((layer) => ({
        layerType: layer.layerType,
        position: layer.position,
        props: layer.props as Record<string, unknown>,
      }))
      return { success: true as const, data: rows }
    }
    return {
      success: true as const,
      data: layers.map((l) => ({
        layerType: l.layerType,
        position: l.position,
        props: l.props as Record<string, unknown>,
      })),
    }
  } catch (error) {
    console.error(`Failed to fetch page_layers for ${pagePath}:`, error)
    return { success: false as const, error: "Failed to fetch page layers" }
  }
}

export async function removeCategory(id: string | number): Promise<{ success: true } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await deleteCategory(id)
    revalidatePath("/admin/pages")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete category from Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to delete category"
    return { success: false, error: message }
  }
}
