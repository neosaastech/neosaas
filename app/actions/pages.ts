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
  listPageVersions,
  restorePageVersion,
  listBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listMedia,
  uploadMedia,
  deleteMedia,
  transformMedia,
  renameMedia,
  updateMediaAlt,
  fetchMediaAsDataUrl,
  replaceMediaFile,
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
  type PayloadMediaSummary,
  type ListMediaOptions,
  type MediaTransformInput,
  type PayloadPageVersion,
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
  input: PageWriteInput | Partial<PageWriteInput>,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadPageDoc } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Partial when id is set (inline edit / bulk actions on an existing doc
    // — Payload's PATCH only validates the fields actually sent), full
    // PageWriteInput required for a create (id === null).
    const page = id ? await updatePage(id, input, locale) : await createPage(input as PageWriteInput, locale)
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
 * Charles (2026-07-15): "le versionning temporel qui est une realite dans
 * payload" — surfaces Payload's own version history (every draft/publish
 * save already produces one, Pages.ts's versions:{drafts:true}) in the page
 * editor's Settings tab instead of requiring the separate Payload admin.
 * Read-only list — no role gate, same convention as getContentPage.
 */
export async function getContentPageVersions(
  id: string | number,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadPageVersion[] } | { success: false; error: string }> {
  try {
    const versions = await listPageVersions(id, locale)
    return { success: true, data: versions }
  } catch (error) {
    console.error("Failed to fetch page versions from Payload:", error)
    return { success: false, error: "Failed to fetch version history" }
  }
}

/**
 * Rewrites the live doc back to a past version — a real write, same
 * admin/super_admin gate as saveContentPage.
 */
export async function restoreContentPageVersion(
  versionId: string,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadPageDoc } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  try {
    const page = await restorePageVersion(versionId, locale)
    revalidatePath("/admin/pages")
    return { success: true, data: page }
  } catch (error) {
    console.error("Failed to restore page version:", error)
    const message = error instanceof Error ? error.message : "Failed to restore version"
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
  input: BlogPostWriteInput | Partial<BlogPostWriteInput>,
  locale: string = "fr",
): Promise<{ success: true; data: PayloadBlogPostDoc } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const article = id ? await updateBlogPost(id, input, locale) : await createBlogPost(input as BlogPostWriteInput, locale)
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

/** Backs MediaPickerField's search — Media.access.read is public in Payload, no role gate needed to read. */
export async function getContentMedia(
  options: ListMediaOptions = {},
): Promise<{ success: true; data: PayloadMediaSummary[] } | { success: false; error: string }> {
  try {
    const result = await listMedia(options)
    return { success: true, data: result.docs }
  } catch (error) {
    console.error("Failed to fetch media from Payload:", error)
    return { success: false, error: "Failed to fetch media" }
  }
}

/**
 * Generic media upload — Charles (2026-07-11): "j'ai un lien direct vers
 * payload [pour la médiathèque]. c'est pas génial. je dois avoir les
 * mêmes fonctionnalités depuis l'ui [neosaas-app]." Same write-role gate
 * as saveContentPage/saveCategory (Media.access.read is public in Payload,
 * but write isn't exposed to visitors — this action is the only path).
 * Not scoped to any one field/collection, unlike the older
 * company-logo-upload.tsx route (which also writes to a completely
 * different, non-Payload storage) — this is the general "add to the
 * shared media library" entry point every block/page picker reads from.
 */
export async function uploadContentMedia(
  formData: FormData,
): Promise<{ success: true; data: PayloadMediaSummary } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" }
  }
  const alt = formData.get("alt")
  try {
    const doc = await uploadMedia(file, typeof alt === "string" ? alt : undefined)
    revalidatePath("/admin/pages")
    return { success: true, data: doc }
  } catch (error) {
    console.error("Failed to upload media to Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to upload media"
    return { success: false, error: message }
  }
}

export async function removeContentMedia(id: string | number): Promise<{ success: true } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  try {
    await deleteMedia(id)
    revalidatePath("/admin/pages")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete media from Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to delete media"
    return { success: false, error: message }
  }
}

export async function transformContentMedia(
  id: string | number,
  input: MediaTransformInput,
): Promise<{ success: true; data: PayloadMediaSummary } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  try {
    const doc = await transformMedia(id, input)
    revalidatePath("/admin/pages")
    return { success: true, data: doc }
  } catch (error) {
    console.error("Failed to transform media in Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to transform media"
    return { success: false, error: message }
  }
}

export async function renameContentMedia(
  id: string | number,
  filename: string,
): Promise<{ success: true; data: PayloadMediaSummary } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  try {
    const doc = await renameMedia(id, filename)
    revalidatePath("/admin/pages")
    return { success: true, data: doc }
  } catch (error) {
    console.error("Failed to rename media in Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to rename media"
    return { success: false, error: message }
  }
}

export async function updateContentMediaAlt(
  id: string | number,
  alt: string,
): Promise<{ success: true; data: PayloadMediaSummary } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  try {
    const doc = await updateMediaAlt(id, alt)
    revalidatePath("/admin/pages")
    return { success: true, data: doc }
  } catch (error) {
    console.error("Failed to update media alt text in Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to update media alt text"
    return { success: false, error: message }
  }
}

// Charles (2026-07-11): "on a encore quelques fonctionnalités de
// modification d'image. tel que le redimensionnement ou la découpe dans
// l'édition." Crop (unlike resize/rotate/quality) needs the actual pixel
// bytes client-side for react-easy-crop's interactive preview — this
// fetches them server-side as a data: URL to avoid a CORS-tainted canvas
// from loading the raw S3 url directly in the browser.
export async function getContentMediaDataUrl(
  id: string | number,
): Promise<{ success: true; dataUrl: string; mimeType: string } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  try {
    const result = await fetchMediaAsDataUrl(id)
    return { success: true, ...result }
  } catch (error) {
    console.error("Failed to fetch media as data URL:", error)
    const message = error instanceof Error ? error.message : "Failed to load image"
    return { success: false, error: message }
  }
}

export async function replaceContentMediaFile(
  id: string | number,
  formData: FormData,
): Promise<{ success: true; data: PayloadMediaSummary } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" }
  }
  try {
    const doc = await replaceMediaFile(id, file)
    revalidatePath("/admin/pages")
    return { success: true, data: doc }
  } catch (error) {
    console.error("Failed to replace media file in Payload:", error)
    const message = error instanceof Error ? error.message : "Failed to save cropped image"
    return { success: false, error: message }
  }
}

/**
 * Bulk delete — Charles (2026-07-11): "on devrait avoir des sélections
 * multiples pour modifier en masse les images." Loops rather than a single
 * Payload `where[id][in]` bulk call: deleteMedia's per-id error handling
 * (and the S3 object cleanup it triggers via Payload's afterDelete hook)
 * stays identical to the single-delete path, and a partial failure still
 * reports exactly which ids failed instead of an all-or-nothing result.
 */
export async function removeContentMediaBulk(
  ids: (string | number)[],
): Promise<{ success: true; failed: (string | number)[] } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  const failed: (string | number)[] = []
  for (const id of ids) {
    try {
      await deleteMedia(id)
    } catch (error) {
      console.error(`Failed to delete media ${id} from Payload:`, error)
      failed.push(id)
    }
  }
  revalidatePath("/admin/pages")
  return { success: true, failed }
}

export async function updateContentMediaAltBulk(
  ids: (string | number)[],
  alt: string,
): Promise<{ success: true; failed: (string | number)[] } | { success: false; error: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return { success: false, error: "Unauthorized" }
  }
  const failed: (string | number)[] = []
  for (const id of ids) {
    try {
      await updateMediaAlt(id, alt)
    } catch (error) {
      console.error(`Failed to update alt for media ${id} in Payload:`, error)
      failed.push(id)
    }
  }
  revalidatePath("/admin/pages")
  return { success: true, failed }
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
