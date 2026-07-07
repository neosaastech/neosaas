/**
 * Server-only bridge to the central Payload CMS's REST API — the content-
 * management UI bridge confirmed 2026-07-04 (Notion "Payload CMS multi-site").
 * Payload stays the single source of writes/schema for Pages/BlogPosts; this
 * app never writes to its own page_layers/blog_posts tables directly for
 * this content — those tables are only ever populated by Payload's own
 * sync hooks, unaffected by anything in this file.
 *
 * PAYLOAD_SERVICE_API_KEY belongs to a dedicated Payload user scoped to
 * ONLY this site's own tenant (not super-admin — a broader service account
 * would be able to read every other tenant's data, including their
 * Tenant.databaseUrl, a real credential). Never expose this key to the
 * browser; every caller here must be a server component or route handler.
 */

const PAYLOAD_API_URL = process.env.PAYLOAD_API_URL
const PAYLOAD_SERVICE_API_KEY = process.env.PAYLOAD_SERVICE_API_KEY
export const PAYLOAD_TENANT_ID = process.env.PAYLOAD_TENANT_ID

function assertConfigured(): void {
  if (!PAYLOAD_API_URL || !PAYLOAD_SERVICE_API_KEY || !PAYLOAD_TENANT_ID) {
    throw new Error(
      "Payload bridge not configured — PAYLOAD_API_URL / PAYLOAD_SERVICE_API_KEY / PAYLOAD_TENANT_ID must be set.",
    )
  }
}

async function payloadFetch(path: string, init?: RequestInit): Promise<Response> {
  assertConfigured()
  const res = await fetch(`${PAYLOAD_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `users API-Key ${PAYLOAD_SERVICE_API_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  })
  return res
}

export interface PayloadPageSummary {
  id: string | number
  title: string
  slug: string
  path: string
  parent: string | number | null
  pageType?: string | null
  // Populated objects (not bare IDs) — listPages fetches at depth=1
  // specifically so the Content Hub table can show real names instead of
  // opaque relationship IDs (Charles, 2026-07-05: "on doit avoir... le nom
  // du créateur, la catégorie de page").
  category?: { id: string | number; name: string; slug: string } | null
  // Payload's Users collection only has `email` (no name fields) — that's
  // the real display identity for "creator", not a placeholder.
  author?: { id: string | number; email: string } | null
  publishedAt?: string | null
  _status: "draft" | "published"
  updatedAt: string
}

export interface PayloadPageBlock {
  id?: string
  blockType: string
  [key: string]: unknown
}

export interface PayloadPageDoc extends PayloadPageSummary {
  layout: PayloadPageBlock[]
  seo?: { metaTitle?: string | null; metaDescription?: string | null }
}

export interface PaginatedResult<T> {
  docs: T[]
  totalDocs: number
  totalPages: number
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface ListPagesOptions {
  page?: number
  limit?: number
  /** Filter by pageType (landing/article) — the content-hub category filter. */
  pageType?: string
}

/**
 * Lists this tenant's own Pages only — never another site's. Paginated
 * (Payload's native REST pagination, not a client-side slice) since a real
 * site can end up with dozens/hundreds of pages once Pilier A / more
 * marketing pages land — loading everything at once doesn't scale.
 */
export async function listPages(options: ListPagesOptions = {}): Promise<PaginatedResult<PayloadPageSummary>> {
  const { page = 1, limit = 20, pageType } = options
  const params = new URLSearchParams({
    "where[tenant][equals]": String(PAYLOAD_TENANT_ID),
    // depth=1 (not 0) so category/author come back as populated
    // {id, name/email} objects the table can display directly, not bare
    // relationship IDs — this is the one list call the Content Hub table
    // renders from, so it's worth the extra join cost here specifically.
    depth: "1",
    limit: String(limit),
    page: String(page),
    sort: "path",
  })
  if (pageType) params.set("where[pageType][equals]", pageType)

  const res = await payloadFetch(`/pages?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listPages failed (${res.status})`)
  }
  return res.json()
}

export async function getPage(id: string | number): Promise<PayloadPageDoc> {
  const res = await payloadFetch(`/pages/${id}?depth=1`)
  if (!res.ok) {
    throw new Error(`Payload bridge: getPage(${id}) failed (${res.status})`)
  }
  return res.json()
}

/**
 * Live Preview only — fetches a page straight from Payload including
 * unpublished drafts (`draft=true`), unlike every other read in this file
 * which only ever sees what the sync hooks already pushed into this site's
 * own page_layers table. depth=2 so an `image` upload resolves to `{ url }`
 * (lib/layers/from-payload.ts needs the populated object, not a bare ID).
 */
export async function getPageForPreview(path: string, locale: string): Promise<PayloadPageDoc | null> {
  const params = new URLSearchParams({
    "where[tenant][equals]": String(PAYLOAD_TENANT_ID),
    "where[path][equals]": path,
    depth: "2",
    draft: "true",
    locale,
    limit: "1",
  })
  const res = await payloadFetch(`/pages?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: getPageForPreview(${path}) failed (${res.status})`)
  }
  const result = (await res.json()) as PaginatedResult<PayloadPageDoc>
  return result.docs[0] ?? null
}

export interface PageWriteInput {
  title: string
  slug: string
  parent?: string | number | null
  pageType?: string
  category?: string | number | null
  layout: PayloadPageBlock[]
  seo?: { metaTitle?: string; metaDescription?: string }
  _status: "draft" | "published"
}

/** Always tagged with this site's own tenant — a bridge caller can't write into another site. */
export async function createPage(input: PageWriteInput): Promise<PayloadPageDoc> {
  const res = await payloadFetch(`/pages`, {
    method: "POST",
    body: JSON.stringify({ ...input, tenant: PAYLOAD_TENANT_ID }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: createPage failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return data.doc as PayloadPageDoc
}

export async function updatePage(
  id: string | number,
  input: Partial<PageWriteInput>,
): Promise<PayloadPageDoc> {
  const res = await payloadFetch(`/pages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: updatePage(${id}) failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return data.doc as PayloadPageDoc
}

// ─── BlogPosts (Articles) — the other content-hub category alongside Pages ───

export interface PayloadCategorySummary {
  id: string | number
  name: string
  slug: string
  path: string
  parent: string | number | null
}

/** Categories are typically few (tens, not hundreds) — no pagination needed for a filter dropdown. */
export async function listCategories(): Promise<PayloadCategorySummary[]> {
  const res = await payloadFetch(
    `/categories?where[tenant][equals]=${PAYLOAD_TENANT_ID}&depth=0&limit=200&sort=path`,
  )
  if (!res.ok) {
    throw new Error(`Payload bridge: listCategories failed (${res.status})`)
  }
  const data = await res.json()
  return data.docs as PayloadCategorySummary[]
}

export interface CategoryWriteInput {
  name: string
  slug: string
  parent?: string | number | null
}

/** Always tagged with this site's own tenant, same rule as createPage/createBlogPost. */
export async function createCategory(input: CategoryWriteInput): Promise<PayloadCategorySummary> {
  const res = await payloadFetch(`/categories`, {
    method: "POST",
    body: JSON.stringify({ ...input, tenant: PAYLOAD_TENANT_ID }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: createCategory failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return data.doc as PayloadCategorySummary
}

export async function updateCategory(id: string | number, input: CategoryWriteInput): Promise<PayloadCategorySummary> {
  const res = await payloadFetch(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: updateCategory(${id}) failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return data.doc as PayloadCategorySummary
}

export async function deleteCategory(id: string | number): Promise<void> {
  const res = await payloadFetch(`/categories/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: deleteCategory(${id}) failed (${res.status}): ${body}`)
  }
}

export interface PayloadBlogPostSummary {
  id: string | number
  title: string
  slug: string
  category: string | number | null
  excerpt?: string | null
  publishedAt?: string | null
  _status: "draft" | "published"
  updatedAt: string
}

export interface PayloadBlogPostDoc extends PayloadBlogPostSummary {
  body?: unknown
  coverImage?: string | number | null
  seo?: { metaTitle?: string | null; metaDescription?: string | null }
}

export interface ListBlogPostsOptions {
  page?: number
  limit?: number
  category?: string | number
}

export async function listBlogPosts(
  options: ListBlogPostsOptions = {},
): Promise<PaginatedResult<PayloadBlogPostSummary>> {
  const { page = 1, limit = 20, category } = options
  const params = new URLSearchParams({
    "where[tenant][equals]": String(PAYLOAD_TENANT_ID),
    depth: "0",
    limit: String(limit),
    page: String(page),
    sort: "-publishedAt",
  })
  if (category) params.set("where[category][equals]", String(category))

  const res = await payloadFetch(`/blog-posts?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listBlogPosts failed (${res.status})`)
  }
  return res.json()
}

export async function getBlogPost(id: string | number): Promise<PayloadBlogPostDoc> {
  const res = await payloadFetch(`/blog-posts/${id}?depth=1`)
  if (!res.ok) {
    throw new Error(`Payload bridge: getBlogPost(${id}) failed (${res.status})`)
  }
  return res.json()
}

export interface BlogPostWriteInput {
  title: string
  slug: string
  category?: string | number | null
  excerpt?: string
  /**
   * Real Payload Lexical richText JSON (the same `editorState.toJSON()`
   * shape Payload's own admin produces) — components/admin/content/
   * rich-text-editor.tsx is a genuine Lexical-based WYSIWYG (Charles,
   * 2026-07-04: "il faut un véritable éditeur"), not a plain-text stand-in,
   * so this passes straight through with no lossy conversion.
   */
  body?: unknown
  publishedAt?: string | null
  seo?: { metaTitle?: string; metaDescription?: string }
  _status: "draft" | "published"
}

export async function createBlogPost(input: BlogPostWriteInput): Promise<PayloadBlogPostDoc> {
  const res = await payloadFetch(`/blog-posts`, {
    method: "POST",
    body: JSON.stringify({ ...input, tenant: PAYLOAD_TENANT_ID }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: createBlogPost failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return data.doc as PayloadBlogPostDoc
}

export async function updateBlogPost(
  id: string | number,
  input: Partial<BlogPostWriteInput>,
): Promise<PayloadBlogPostDoc> {
  const res = await payloadFetch(`/blog-posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: updateBlogPost(${id}) failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return data.doc as PayloadBlogPostDoc
}

// ─── Generic collection CRUD (Metadata-Driven UI — types/form-builder.ts) ───
// Unlike the Pages helpers above, these aren't tenant-scoped: an arbitrary
// dashboard-feature collection (e.g. "quotes") isn't necessarily registered
// under @payloadcms/plugin-multi-tenant at all. Callers (the
// /api/dashboard/[feature] proxy routes) are responsible for any further
// scoping a given collection needs (e.g. filtering by company) — this layer
// only forwards to Payload's REST API with the service credential.

export interface PayloadListResult<T = Record<string, unknown>> {
  docs: T[]
  totalDocs: number
  totalPages: number
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export async function listCollection(
  slug: string,
  searchParams: URLSearchParams,
): Promise<PayloadListResult> {
  const res = await payloadFetch(`/${slug}?${searchParams.toString()}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listCollection(${slug}) failed (${res.status})`)
  }
  return res.json()
}

export async function createCollectionDoc(
  slug: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await payloadFetch(`/${slug}`, { method: "POST", body: JSON.stringify(data) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: createCollectionDoc(${slug}) failed (${res.status}): ${body}`)
  }
  const result = await res.json()
  return result.doc
}

export async function updateCollectionDoc(
  slug: string,
  id: string | number,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await payloadFetch(`/${slug}/${id}`, { method: "PATCH", body: JSON.stringify(data) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: updateCollectionDoc(${slug}, ${id}) failed (${res.status}): ${body}`)
  }
  const result = await res.json()
  return result.doc
}
