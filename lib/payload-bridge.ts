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

interface PayloadFieldError {
  label?: string
  message?: string
  path?: string
}

// Payload's own validation error shape (confirmed live):
// { errors: [{ message, data: { errors: [{ label, message, path }, ...] } }] }
// — every write error path in this file used to throw the raw JSON body
// verbatim, which the Content Hub then dumped straight into a toast
// (Charles, 2026-08-09: "pas super clair comme notification" — a wall of
// `{"errors":[{"name":"a","data":{...` is not something an editor can act
// on). Extracts the actual per-field messages Payload already computed
// (e.g. "Contenu > Layout > Block 2 (Feature grid) > Features 3 > Icon:
// This field is required.") instead, falling back to the raw body only
// when the response isn't this shape at all (a real server error, a proxy
// 502, ...) — those genuinely have no better message to extract.
function formatPayloadError(operation: string, status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { errors?: Array<{ message?: string; data?: { errors?: PayloadFieldError[] } }> }
    const fieldErrors = parsed.errors?.flatMap((e) => e.data?.errors ?? []) ?? []
    if (fieldErrors.length > 0) {
      const lines = fieldErrors.map((fe) => `- ${fe.label ?? fe.path ?? "Champ"} : ${fe.message ?? "invalide"}`)
      return `${operation} : champs invalides —\n${lines.join("\n")}`
    }
    const topMessage = parsed.errors?.[0]?.message
    if (topMessage) return `${operation} : ${topMessage}`
  } catch {
    // Not JSON (or not this shape) — fall through to the raw-body message below.
  }
  return `${operation} failed (${status}): ${body}`
}

// Pages/BlogPosts' actual Payload field is `meta` — @payloadcms/plugin-seo's
// own group name (payload.config.ts's seoPlugin, migrated from a hand-rolled
// `seo` group). Every interface and caller in this file still calls it `seo`
// (the pre-migration name), so every read/write below went straight past
// Payload's real field: reads always got `undefined` (defaulting every
// noIndex/noFollow checkbox and the Index & Follow table badges to false
// regardless of the stored value) and writes were silently discarded (no
// error — `seo` just isn't a field Payload recognizes, so plugin-seo's
// group never received it). Confirmed live 2026-07-10: toggling noIndex
// from the table returned 200/"Draft saved successfully" with the value
// unchanged on immediate re-read. These two helpers translate at this
// file's boundary only — every caller elsewhere keeps using `.seo`, no
// need to touch page-editor.tsx/article-editor.tsx/pages-settings.tsx/the
// MCP content-hub tools.
function metaToSeo(doc: unknown): Record<string, unknown> {
  const { meta, ...rest } = doc as Record<string, unknown>
  return { ...rest, seo: meta }
}

function seoToMetaBody(input: unknown): Record<string, unknown> {
  const { seo, ...rest } = input as Record<string, unknown>
  return seo === undefined ? rest : { ...rest, meta: seo }
}

// READ direction — `seo.image` arrives as Payload's populated media relation
// ({id, url} at depth=1) via metaToSeo's generic rename; unpacked to a plain
// absolute URL string here so callers (PageEditor/ArticleEditor's
// MediaPickerField) see the exact same shape as any other imageUrl field.
function unpackSeoImage<T extends { seo?: { image?: unknown } | null }>(doc: T): T {
  if (!doc.seo || !("image" in doc.seo)) return doc
  return { ...doc, seo: { ...doc.seo, image: unpackImage(doc.seo.image) } }
}

// WRITE direction — the mirror of unpackSeoImage: a plain URL string (or
// null to clear) coming from MediaPickerField, resolved to the media
// relation ID plugin-seo's meta.image actually stores. Only touches `.image`
// when the caller explicitly set the key (undefined means "not editing SEO
// image on this save", same convention as the rest of this bridge).
async function resolveSeoImage<T extends { image?: string | null }>(
  seo: T | undefined,
): Promise<(Omit<T, "image"> & { image?: string | number | null }) | undefined> {
  if (!seo || !("image" in seo)) return seo
  const { image, ...rest } = seo
  return { ...rest, image: image ? await resolveMediaIdByUrl(image) : null }
}

// Written by payload-cms's syncPageAfterChange/syncBlogPostAfterChange right
// after a sync attempt — surfaces what used to be a server-only log line, so
// "Published" in this table can't silently mean "actually 404s on the real
// site" anymore (Charles, 2026-07-08).
export interface PayloadSyncStatus {
  ok: boolean | null
  message: string | null
  syncedAt: string | null
}

export interface PayloadPageSummary {
  id: string | number
  title: string
  slug: string
  path: string
  // Populated at depth=1 same as category/author below — was typed as a
  // bare id (never true at runtime for this call), which made a "Parent"
  // column impossible without a second lookup. relationId()/relationLabel()
  // in pages-settings.tsx unwrap this consistently.
  parent: string | number | { id: string | number; title?: string; path?: string } | null
  pageType?: string | null
  // Populated objects (not bare IDs) — listPages fetches at depth=1
  // specifically so the Content Hub table can show real names instead of
  // opaque relationship IDs (Charles, 2026-07-05: "on doit avoir... le nom
  // du créateur, la catégorie de page").
  category?: { id: string | number; name: string; slug: string } | null
  // Payload's Users gained an optional `name` field 2026-07-09 (Charles:
  // the Content Hub showed a raw email) — `name` is null for any user who
  // hasn't set one, callers fall back to `email`.
  author?: { id: string | number; email: string; name?: string | null } | null
  publishedAt?: string | null
  _status: "draft" | "published"
  createdAt: string
  updatedAt: string
  syncStatus?: PayloadSyncStatus | null
  // Charles (2026-07-10): index/follow visible directly in the recap table,
  // not just inside the SEO tab — listPages already returns every top-level
  // field, this just types what was already coming back unused.
  seo?: { noIndex?: boolean | null; noFollow?: boolean | null }
  // Charles (2026-07-15): "un bouton cliquable qui détermine une page comme
  // page d'accueil de sa langue" (payload-cms Pages.homeForLocale) — same
  // "already in the response, just never typed" situation as seo above.
  // Read-only display here: Payload's own admin is the only place this is
  // editable, this Content Hub only surfaces it.
  homeForLocale?: "" | "fr" | "en" | null
}

export interface PayloadPageBlock {
  id?: string
  blockType: string
  [key: string]: unknown
}

// Content Hub's own generic form builder (registry-client.ts propsSchema,
// dynamic-field.tsx) only ever knew a flat shape (imageUrl, ctaHref,
// ctaLabel) — but Payload's real block schemas (payload-cms's Hero.ts,
// @neomnia/ui's hero-split/cta-banner/testimonials/pricing-table configs)
// declare `image` as an upload RELATION (expects a Media doc ID, not a URL)
// and `cta`/`secondaryCta` as a nested linkField GROUP
// ({type,reference,url,label}), not flat strings. Content Hub PATCHed the
// flat shape straight to Payload's REST API, which silently drops any
// field it doesn't recognize — confirmed live 2026-07-09 (selected a real
// media item via MediaPickerField, saved, re-fetched from Payload: `image`
// was still null). This predates today; lib/layers/from-payload.ts and
// payload-cms's own sync/targets/neosaas-app.ts already do this same
// translation for the LIVE SITE's read path (Live Preview / publish sync) —
// this is the missing third leg, for Content Hub's own edit bridge.
// fromPayloadBlock runs on every getPage() read; toPayloadBlock runs on
// every createPage()/updatePage() write. Only Pages go through BlockEditor
// (ArticleEditor has no `layout` field at all — BlogPostWriteInput doesn't
// declare one), so BlogPosts are untouched.
export interface PayloadLinkValue {
  type?: "reference" | "custom"
  newTab?: boolean | null
  reference?: { relationTo?: string; value?: unknown } | string | number | null
  url?: string | null
  label?: string | null
}

// feature-grid's and pricing-table's `items[].bullets` is a Payload array of
// `{ text }` rows (@neomnia/ui's config.ts), but Content Hub's generic
// BlockEditor form (registry-client.ts's featureGridItemSchema/
// pricingTablePlanSchema) only ever knew `bullets: string[]` — the same flat-
// vs-nested mismatch already fixed for image/cta/link fields above, just not
// yet for this one. Unnoticed until now because a required, minRows:1 array
// field rejects a plain string row outright (Payload can't read `.text` off
// a string), which is the "Features"/"Plans" 400 this fixes.
function unpackBullets(bullets: unknown): string[] {
  if (!Array.isArray(bullets)) return []
  return (bullets as Array<{ text?: string } | string>).map((b) => (typeof b === "string" ? b : b.text ?? ""))
}

function packBullets(bullets: unknown): { text: string }[] {
  if (!Array.isArray(bullets)) return []
  return (bullets as string[]).map((text) => ({ text }))
}

function unpackLink(link: unknown): { label?: string; href?: string } {
  if (!link || typeof link !== "object") return {}
  const l = link as PayloadLinkValue
  if (l.type === "reference" && l.reference) {
    const populated =
      typeof l.reference === "object" && l.reference !== null && "value" in l.reference
        ? (l.reference as { value: unknown }).value
        : l.reference
    const href = populated && typeof populated === "object" && "path" in populated ? (populated as { path?: string }).path : undefined
    return { label: l.label ?? undefined, href }
  }
  return { label: l.label ?? undefined, href: l.url ?? undefined }
}

function unpackImage(image: unknown): string | undefined {
  if (!image || typeof image !== "object" || !("url" in image)) return undefined
  const url = (image as { url?: string }).url
  // Same relative-URL gotcha as listMedia() below (Payload has no
  // serverURL configured) — made absolute here too so a block's existing
  // imageUrl always matches listMedia()'s own absolute URLs, letting
  // MediaPickerField's `options.find((m) => m.url === value)` resolve the
  // combobox's display label instead of falling back to "Select media...".
  return url && url.startsWith("/") && PAYLOAD_ORIGIN ? `${PAYLOAD_ORIGIN}${url}` : (url ?? undefined)
}

/** READ direction — Payload's raw block shape → the flat shape BlockEditor's generic form expects. */
function fromPayloadBlock(block: PayloadPageBlock): PayloadPageBlock {
  const next: PayloadPageBlock = { ...block }

  if (block.blockType === "columns" && Array.isArray(block.columns)) {
    next.columns = (block.columns as Array<Record<string, unknown>>).map((col) => ({
      ...col,
      blocks: Array.isArray(col.blocks) ? (col.blocks as PayloadPageBlock[]).map(fromPayloadBlock) : col.blocks,
    }))
    return next
  }

  if (["hero", "hero-split", "cta-banner"].includes(block.blockType)) {
    if ("cta" in block) {
      const { label, href } = unpackLink(block.cta)
      next.ctaLabel = label
      next.ctaHref = href
    }
    if ("secondaryCta" in block) {
      const { label, href } = unpackLink(block.secondaryCta)
      next.secondaryCtaLabel = label
      next.secondaryCtaHref = href
    }
  }

  if (["hero", "hero-split"].includes(block.blockType) && "image" in block) {
    next.imageUrl = unpackImage(block.image)
  }

  if (block.blockType === "icon-showcase") {
    if ("image" in block) next.imageUrl = unpackImage(block.image)
    if ("video" in block) next.videoUrl = unpackImage(block.video)
  }

  if (block.blockType === "testimonials" && Array.isArray(block.items)) {
    next.items = (block.items as Array<Record<string, unknown>>).map((item) => ({ ...item, imageUrl: unpackImage(item.image) }))
  }

  // See toPayloadBlock's matching logo-cloud case — same missed block type,
  // read direction.
  if (block.blockType === "logo-cloud" && Array.isArray(block.items)) {
    next.items = (block.items as Array<Record<string, unknown>>).map((item) => ({ ...item, imageUrl: unpackImage(item.image) }))
  }

  if (block.blockType === "feature-grid" && Array.isArray(block.items)) {
    next.items = (block.items as Array<Record<string, unknown>>).map((item) => ({ ...item, bullets: unpackBullets(item.bullets) }))
  }

  if (block.blockType === "pricing-table" && Array.isArray(block.items)) {
    next.items = (block.items as Array<Record<string, unknown>>).map((item) => {
      const { label, href } = unpackLink(item.cta)
      return { ...item, ctaLabel: label, ctaHref: href, bullets: unpackBullets(item.bullets) }
    })
  }

  return next
}

// Payload's Media doc ID isn't known client-side (MediaPickerField only
// carries the resolved absolute URL, for display) — resolved by filename,
// the one stable identifier both sides share. Returns null (not throwing)
// on no match — a raw external URL not in Payload's media library has no
// relation to point to, so the image field is cleared rather than the
// whole save failing.
async function resolveMediaIdByUrl(url: string | undefined): Promise<string | number | null> {
  if (!url) return null
  const filename = url.split("/").pop()
  if (!filename) return null
  const params = new URLSearchParams({
    "where[tenant][equals]": String(PAYLOAD_TENANT_ID),
    "where[filename][equals]": filename,
    limit: "1",
  })
  const result = await listCollection<{ id: string | number }>("media", params)
  return result.docs[0]?.id ?? null
}

// Content Hub's LinkFieldInput already resolves an "existing page" choice
// down to a plain path string (including hardcoded pages like /pricing that
// aren't real Payload docs at all — see link-field-input.tsx) — there's no
// page ID to hand Payload's `reference` relation, so every write goes back
// as type:"custom" with that path as `url`. Loses Payload's own "auto-heals
// if the target page is renamed" behavior for reference-type links edited
// via Payload's own admin, but matches what Content Hub already promises
// (this is the same value the UI showed and the user picked).
function packLink(href: unknown, label: unknown, existing: unknown): PayloadLinkValue {
  const existingLink = existing && typeof existing === "object" ? (existing as PayloadLinkValue) : undefined
  return {
    type: "custom",
    url: (href as string) || undefined,
    label: (label as string) || undefined,
    newTab: existingLink?.newTab ?? false,
  }
}

/** WRITE direction — the flat shape BlockEditor produces → Payload's real block shape. */
async function toPayloadBlock(block: PayloadPageBlock): Promise<PayloadPageBlock> {
  const next: PayloadPageBlock = { ...block }

  if (block.blockType === "columns" && Array.isArray(block.columns)) {
    next.columns = await Promise.all(
      (block.columns as Array<Record<string, unknown>>).map(async (col) => ({
        ...col,
        blocks: Array.isArray(col.blocks) ? await Promise.all((col.blocks as PayloadPageBlock[]).map(toPayloadBlock)) : col.blocks,
      })),
    )
    return next
  }

  if (["hero", "hero-split", "cta-banner"].includes(block.blockType)) {
    if ("ctaHref" in block || "ctaLabel" in block) {
      next.cta = packLink(block.ctaHref, block.ctaLabel, block.cta)
      delete next.ctaHref
      delete next.ctaLabel
    }
    if ("secondaryCtaHref" in block || "secondaryCtaLabel" in block) {
      next.secondaryCta = packLink(block.secondaryCtaHref, block.secondaryCtaLabel, block.secondaryCta)
      delete next.secondaryCtaHref
      delete next.secondaryCtaLabel
    }
  }

  if (["hero", "hero-split"].includes(block.blockType) && "imageUrl" in block) {
    next.image = await resolveMediaIdByUrl(block.imageUrl as string | undefined)
    delete next.imageUrl
  }

  if (block.blockType === "icon-showcase") {
    if ("imageUrl" in block) {
      next.image = await resolveMediaIdByUrl(block.imageUrl as string | undefined)
      delete next.imageUrl
    }
    if ("videoUrl" in block) {
      next.video = await resolveMediaIdByUrl(block.videoUrl as string | undefined)
      delete next.videoUrl
    }
  }

  if (block.blockType === "testimonials" && Array.isArray(block.items)) {
    next.items = await Promise.all(
      (block.items as Array<Record<string, unknown>>).map(async (item) => {
        const { imageUrl, ...rest } = item
        return { ...rest, image: await resolveMediaIdByUrl(imageUrl as string | undefined) }
      }),
    )
  }

  // Missed when logo-cloud was added — items[].imageUrl (Content Hub's flat
  // form shape) was never converted to items[].image (Payload's real
  // relation field), so a logo picked in the editor silently never made it
  // past this bridge: the save "succeeded" (Payload just ignores the
  // unrecognized `imageUrl` key) but `image` stayed null forever. Same
  // pattern as testimonials above.
  if (block.blockType === "logo-cloud" && Array.isArray(block.items)) {
    next.items = await Promise.all(
      (block.items as Array<Record<string, unknown>>).map(async (item) => {
        const { imageUrl, ...rest } = item
        return { ...rest, image: await resolveMediaIdByUrl(imageUrl as string | undefined) }
      }),
    )
  }

  if (block.blockType === "feature-grid" && Array.isArray(block.items)) {
    next.items = (block.items as Array<Record<string, unknown>>).map((item) => ({ ...item, bullets: packBullets(item.bullets) }))
  }

  if (block.blockType === "pricing-table" && Array.isArray(block.items)) {
    next.items = (block.items as Array<Record<string, unknown>>).map((item) => {
      const { ctaHref, ctaLabel, bullets, ...rest } = item
      const cta = "ctaHref" in item || "ctaLabel" in item ? packLink(ctaHref, ctaLabel, item.cta) : item.cta
      return { ...rest, cta, bullets: packBullets(bullets) }
    })
  }

  return next
}

export interface PayloadPageDoc extends PayloadPageSummary {
  layout: PayloadPageBlock[]
  seo?: {
    metaTitle?: string | null
    metaDescription?: string | null
    noIndex?: boolean | null
    noFollow?: boolean | null
    // plugin-seo's meta.image (Charles, 2026-07-11: header/featured image) —
    // single shared field feeding both og:image/Twitter Card and the public
    // page's visual banner. Unpacked to an absolute URL by unpackSeoImage.
    image?: string
  }
  // Top-level Payload field (Pages.ts's Organisation tab), not part of
  // plugin-seo's `meta` group — Charles (2026-07-09): "ajouter le nom du
  // site ou non sur le SEO dans la balise title."
  includeSiteNameInTitle?: boolean
  // Charles (2026-07-10): "délai de publication"/"délai de dépublication" —
  // acted on by payload-cms's runScheduledPublishing.ts interval, not a
  // display-only date.
  scheduledPublishAt?: string | null
  scheduledUnpublishAt?: string | null
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
  /**
   * Which locale's title/layout to fetch — omitted defaults to Payload's
   * own defaultLocale ('fr', fallback:true), which silently showed French
   * content with no indication that's what was happening (Charles,
   * 2026-07-08: "on ne sait pas quelle langue est engagée"). Content Hub
   * now always passes this explicitly so the locale on screen is a visible
   * choice, not a hidden default.
   */
  locale?: string
}

/**
 * Lists this tenant's own Pages only — never another site's. Paginated
 * (Payload's native REST pagination, not a client-side slice) since a real
 * site can end up with dozens/hundreds of pages once Pilier A / more
 * marketing pages land — loading everything at once doesn't scale.
 */
export async function listPages(options: ListPagesOptions = {}): Promise<PaginatedResult<PayloadPageSummary>> {
  const { page = 1, limit = 20, pageType, locale = "fr" } = options
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
    locale,
    // Payload's global `fallback: true` (payload.config.ts) means a plain
    // `?locale=en` list still returns every page with French content
    // silently standing in for a missing translation — the Content Hub's
    // language filter looked like a no-op because of it (Charles,
    // 2026-07-15: "quelle que soit la langue concernée, tout est affiché").
    // Disabling fallback for THIS list call only means `title` comes back
    // genuinely empty for an untranslated page, which the caller uses to
    // filter the table down to real per-locale content.
    "fallback-locale": "none",
  })
  if (pageType) params.set("where[pageType][equals]", pageType)

  const res = await payloadFetch(`/pages?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listPages failed (${res.status})`)
  }
  const data = (await res.json()) as PaginatedResult<PayloadPageSummary>
  return { ...data, docs: data.docs.map(metaToSeo).map(unpackSeoImage) as unknown as PayloadPageSummary[] }
}

// getPage()'s one caller (getContentPage, app/actions/pages.ts) only ever
// feeds the Content Hub edit form — draft=true so a reopened page shows the
// latest autosaved draft, not the stale main-row snapshot that only moves on
// publish (versions.drafts:true, Pages.ts). Without it, every autosave past
// the first was invisible on reopen: found verifying the feature-grid/
// pricing-table bullets fix (2026-07-10) — page 51 showed 0 blocks in the
// editor despite a newer draft version existing in Postgres.
export async function getPage(id: string | number, locale: string = "fr"): Promise<PayloadPageDoc> {
  const res = await payloadFetch(`/pages/${id}?depth=1&locale=${locale}&draft=true`)
  if (!res.ok) {
    throw new Error(`Payload bridge: getPage(${id}) failed (${res.status})`)
  }
  const doc = (await res.json()) as PayloadPageDoc
  return { ...(unpackSeoImage(metaToSeo(doc) as unknown as PayloadPageDoc)), layout: doc.layout.map(fromPayloadBlock) }
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
  seo?: { metaTitle?: string; metaDescription?: string; noIndex?: boolean; noFollow?: boolean; image?: string | null }
  includeSiteNameInTitle?: boolean
  scheduledPublishAt?: string | null
  scheduledUnpublishAt?: string | null
  // "page d'accueil de sa langue" (Payload's Pages.homeForLocale, non-localized
  // select) — set from the Content Hub editor's Settings tab, enforced unique
  // per (tenant, locale) server-side by validateUniqueHomeForLocale.
  homeForLocale?: "" | "fr" | "en"
  _status: "draft" | "published"
}

/**
 * `draft=true` is only sent when the write's own `_status` is `"draft"` —
 * this is Payload's real draft-versioning flag, not just a label. On
 * `update`, Payload would actually ignore `draft=true` once `_status` is
 * `"published"` anyway (it treats that combination as a real publish), but
 * on `create` it does NOT: `draft=true` unconditionally forces the brand-new
 * document to save as a draft regardless of what `_status` says, which would
 * silently fail a first-time Publish on a page that was never saved before.
 * Deriving the flag from `_status` instead of hardcoding it keeps both
 * operations correct with one shared rule (found 2026-07-10 while wiring
 * PageEditor/ArticleEditor's autosave — see also sync/dispatch.ts's
 * `isDraftOnlySave` check on the payload-cms side, which relies on this same
 * flag to avoid deactivating an already-published page on every autosave).
 */
function draftQueryParam(status: "draft" | "published" | undefined): string {
  return status === "draft" ? "&draft=true" : ""
}

/** Always tagged with this site's own tenant — a bridge caller can't write into another site. */
export async function createPage(input: PageWriteInput, locale: string = "fr"): Promise<PayloadPageDoc> {
  const seo = await resolveSeoImage(input.seo)
  const res = await payloadFetch(`/pages?locale=${locale}${draftQueryParam(input._status)}`, {
    method: "POST",
    body: JSON.stringify({
      ...seoToMetaBody({ ...input, seo }),
      layout: await Promise.all(input.layout.map(toPayloadBlock)),
      tenant: PAYLOAD_TENANT_ID,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: createPage`, res.status, body))
  }
  const data = await res.json()
  return unpackSeoImage(metaToSeo(data.doc) as unknown as PayloadPageDoc)
}

// Without `?locale=`, Payload writes localized fields to its defaultLocale
// (fr) no matter which language an editor thinks they're editing — the
// Content Hub's language filter only ever drove what the *list* displayed
// (Charles, 2026-07-08: "il manque encore des actions" — opening Edit while
// EN was selected silently read AND wrote the fr slot).
export async function updatePage(
  id: string | number,
  input: Partial<PageWriteInput>,
  locale: string = "fr",
): Promise<PayloadPageDoc> {
  const seo = await resolveSeoImage(input.seo)
  const res = await payloadFetch(`/pages/${id}?locale=${locale}${draftQueryParam(input._status)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...seoToMetaBody({ ...input, seo }),
      ...(input.layout ? { layout: await Promise.all(input.layout.map(toPayloadBlock)) } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: updatePage(${id})`, res.status, body))
  }
  const data = await res.json()
  return unpackSeoImage(metaToSeo(data.doc) as unknown as PayloadPageDoc)
}

/**
 * Real Payload delete, not a soft-delete — the sync side (payload-cms's
 * syncPageAfterDelete) already takes the target site's copy dark first, so
 * this only removes the Payload doc itself, which was already unreachable
 * to a visitor before this call. Content Hub had no delete at all until
 * 2026-07-08 (Charles), only Payload's own separate admin did.
 */
export async function deletePage(id: string | number): Promise<void> {
  const res = await payloadFetch(`/pages/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: deletePage(${id})`, res.status, body))
  }
}

// Charles (2026-07-15): "le versionning temporel qui est une réalité dans
// payload" — Pages has `versions: { drafts: true }` (Pages.ts), meaning
// every save (draft or publish) already produces a version snapshot
// server-side; this just surfaces Payload's own findVersions/restoreVersion
// REST endpoints (payload-cms's default collection endpoints, not anything
// custom) from the page editor instead of requiring the separate Payload
// admin at cms.neokube.fr.
export interface PayloadPageVersion {
  id: string
  createdAt: string
  updatedAt: string
  version: {
    title?: string | null
    _status?: "draft" | "published"
  }
}

export async function listPageVersions(pageId: string | number, locale: string = "fr"): Promise<PayloadPageVersion[]> {
  const params = new URLSearchParams({
    "where[parent][equals]": String(pageId),
    sort: "-updatedAt",
    limit: "50",
    depth: "0",
    locale,
  })
  const res = await payloadFetch(`/pages/versions?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listPageVersions(${pageId}) failed (${res.status})`)
  }
  const data = (await res.json()) as { docs: PayloadPageVersion[] }
  return data.docs
}

/**
 * Rewrites the live Page doc back to this version's snapshot (Payload's own
 * restoreVersion operation) — NOT a soft "preview", the current draft/
 * published content is genuinely replaced. Caller (page-editor.tsx) reloads
 * the doc into the form afterward the same way switching locale already does.
 */
export async function restorePageVersion(versionId: string, locale: string = "fr"): Promise<PayloadPageDoc> {
  const res = await payloadFetch(`/pages/versions/${versionId}?locale=${locale}`, { method: "POST" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: restorePageVersion(${versionId})`, res.status, body))
  }
  const data = await res.json()
  return unpackSeoImage(metaToSeo(data.doc) as unknown as PayloadPageDoc)
}

// ─── BlogPosts (Articles) — the other content-hub category alongside Pages ───

export interface PayloadCategorySummary {
  id: string | number
  name: string
  slug: string
  path: string
  // Populated at depth=1, same caveat as PayloadPageSummary.parent — was
  // typed as a bare id, never true at runtime for this call.
  parent: string | number | { id: string | number; name?: string; path?: string } | null
  // Payload's Lexical editor state (richText field, 2026-07-12) — same
  // opaque JSON shape RichTextEditor/RichTextPreview already handle for
  // BlogPost.body, never a plain string.
  description?: unknown
  createdAt: string
  updatedAt: string
  // Populated at depth=1, unpacked to a plain absolute URL — standalone
  // field (relationTo media), not part of a plugin-seo meta group like
  // Pages, since Categories has no title/description generation needs.
  headerImage?: string
}

/** Categories are typically few (tens, not hundreds) — no pagination needed for a filter dropdown. */
export async function listCategories(locale: string = "fr"): Promise<PayloadCategorySummary[]> {
  const res = await payloadFetch(
    // depth=1 (was 0) so headerImage comes back as {id,url} to unpack, same
    // reasoning as listBlogPosts' coverImage.
    `/categories?where[tenant][equals]=${PAYLOAD_TENANT_ID}&depth=1&limit=200&sort=path&locale=${locale}`,
  )
  if (!res.ok) {
    throw new Error(`Payload bridge: listCategories failed (${res.status})`)
  }
  const data = await res.json()
  return (data.docs as Array<PayloadCategorySummary & { headerImage?: unknown }>).map((doc) => ({
    ...doc,
    headerImage: unpackImage(doc.headerImage),
  }))
}

export interface CategoryWriteInput {
  name: string
  slug: string
  parent?: string | number | null
  description?: unknown
  headerImage?: string | null
}

/** Always tagged with this site's own tenant, same rule as createPage/createBlogPost. */
export async function createCategory(input: CategoryWriteInput): Promise<PayloadCategorySummary> {
  const { headerImage, ...rest } = input
  const res = await payloadFetch(`/categories`, {
    method: "POST",
    body: JSON.stringify({
      ...rest,
      ...(headerImage !== undefined ? { headerImage: headerImage ? await resolveMediaIdByUrl(headerImage) : null } : {}),
      tenant: PAYLOAD_TENANT_ID,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: createCategory`, res.status, body))
  }
  const data = await res.json()
  return { ...(data.doc as PayloadCategorySummary), headerImage: unpackImage(data.doc.headerImage) }
}

export async function updateCategory(id: string | number, input: CategoryWriteInput): Promise<PayloadCategorySummary> {
  const { headerImage, ...rest } = input
  const res = await payloadFetch(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...rest,
      ...(headerImage !== undefined ? { headerImage: headerImage ? await resolveMediaIdByUrl(headerImage) : null } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: updateCategory(${id})`, res.status, body))
  }
  const data = await res.json()
  return { ...(data.doc as PayloadCategorySummary), headerImage: unpackImage(data.doc.headerImage) }
}

export async function deleteCategory(id: string | number): Promise<void> {
  const res = await payloadFetch(`/categories/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: deleteCategory(${id})`, res.status, body))
  }
}

// ─── Header / Footer ────────────────────────────────────────────────────────
// One doc per (tenant, scope) — see payload-cms's fields/scope.ts. Unlike
// Pages/BlogPosts/Categories, `link` fields here (linkField() in payload-cms)
// are a structured Payload group — {type, newTab, reference, url, label} —
// not the flat {label,href} shape the *sync* pipeline produces; this bridge
// talks to Payload's REST API directly, so it must read/write that
// structured shape as-is, unflattened.

export type ScopeType = "default" | "page" | "category" | "pageType"

// Reuses the module-local PayloadLinkValue declared above (block cta/
// secondaryCta translation) — same structured shape linkField() produces
// everywhere in payload-cms, no need for a second declaration.
export interface PayloadNavItem {
  link: PayloadLinkValue
  children?: { link: PayloadLinkValue }[]
}

interface ScopeFields {
  scopeType: ScopeType
  scopePage?: string | number | { id: string | number; title?: string; path?: string } | null
  scopeCategory?: string | number | { id: string | number; name?: string; path?: string } | null
  scopePageType?: string | null
}

export interface PayloadHeaderSummary extends ScopeFields {
  id: string | number
  label: string
  updatedAt: string
  _status: "draft" | "published"
}

export type HeaderBrandDisplay = "inherit" | "logo" | "siteName" | "both" | "none"

export interface PayloadSocialLink {
  icon: string
  url: string
}

export interface PayloadHeaderDoc extends PayloadHeaderSummary {
  navItems: PayloadNavItem[]
  cta?: PayloadLinkValue | null
  brandDisplay?: HeaderBrandDisplay
  logo?: string // unpacked to a plain URL, same convention as Footer.logo
  showThemeSwitch?: boolean
  showLocaleSwitcher?: boolean
  showSocialLinks?: boolean
  showAuthButtons?: boolean
  socialLinks?: PayloadSocialLink[]
}

export interface HeaderWriteInput {
  scopeType: ScopeType
  scopePage?: string | number | null
  scopeCategory?: string | number | null
  scopePageType?: string | null
  navItems: PayloadNavItem[]
  cta?: PayloadLinkValue | null
  brandDisplay?: HeaderBrandDisplay
  logo?: string | null
  showThemeSwitch?: boolean
  showLocaleSwitcher?: boolean
  showSocialLinks?: boolean
  showAuthButtons?: boolean
  socialLinks?: PayloadSocialLink[]
  _status: "draft" | "published"
}

/** Header docs are typically few (one Default + a handful of overrides per tenant) — no pagination needed. draft=true so brand-new/unpublished drafts still show up in the recap table. */
export async function listHeaders(locale: string = "fr"): Promise<PayloadHeaderSummary[]> {
  const res = await payloadFetch(`/header?where[tenant][equals]=${PAYLOAD_TENANT_ID}&depth=1&limit=200&sort=-updatedAt&draft=true&locale=${locale}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listHeaders failed (${res.status})`)
  }
  const data = await res.json()
  return data.docs as PayloadHeaderSummary[]
}

/** draft=true — always load the latest version (draft or published), same reasoning as getPage. */
export async function getHeader(id: string | number, locale: string = "fr"): Promise<PayloadHeaderDoc> {
  const res = await payloadFetch(`/header/${id}?depth=1&draft=true&locale=${locale}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: getHeader(${id}) failed (${res.status})`)
  }
  const data = (await res.json()) as PayloadHeaderDoc & { logo?: unknown }
  return { ...data, logo: unpackImage(data.logo) }
}

export async function createHeader(input: HeaderWriteInput, locale: string = "fr"): Promise<PayloadHeaderDoc> {
  const { logo, ...rest } = input
  const draftParam = input._status === "draft" ? "&draft=true" : ""
  const res = await payloadFetch(`/header?locale=${locale}${draftParam}`, {
    method: "POST",
    body: JSON.stringify({
      ...rest,
      ...(logo !== undefined ? { logo: logo ? await resolveMediaIdByUrl(logo) : null } : {}),
      tenant: PAYLOAD_TENANT_ID,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: createHeader`, res.status, body))
  }
  const data = await res.json()
  return { ...(data.doc as PayloadHeaderDoc), logo: unpackImage(data.doc.logo) }
}

export async function updateHeader(id: string | number, input: HeaderWriteInput, locale: string = "fr"): Promise<PayloadHeaderDoc> {
  const { logo, ...rest } = input
  const draftParam = input._status === "draft" ? "&draft=true" : ""
  const res = await payloadFetch(`/header/${id}?locale=${locale}${draftParam}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...rest,
      ...(logo !== undefined ? { logo: logo ? await resolveMediaIdByUrl(logo) : null } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: updateHeader(${id})`, res.status, body))
  }
  const data = await res.json()
  return { ...(data.doc as PayloadHeaderDoc), logo: unpackImage(data.doc.logo) }
}

export async function deleteHeader(id: string | number): Promise<void> {
  const res = await payloadFetch(`/header/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: deleteHeader(${id})`, res.status, body))
  }
}

export interface PayloadFooterSummary extends ScopeFields {
  id: string | number
  label: string
  updatedAt: string
}

// Footer.modules (Charles, 2026-07-14: choix de module — Links/Form/Columns
// — instead of the old fixed columns/formModule fields) reuses
// PayloadPageBlock as-is: same {id?, blockType, ...rest} shape Pages'
// layout blocks already use, no separate type needed. `blockType` is
// "links" | "form" | "columns"; the admin UI branches on it directly.
export interface PayloadFooterDoc extends PayloadFooterSummary {
  modules: PayloadPageBlock[]
  brandDisplay?: HeaderBrandDisplay
  logo?: string // unpacked to a plain URL, same convention as Categories' headerImage
  copyrightText?: string | null
  tagline?: string | null
}

export interface FooterWriteInput {
  scopeType: ScopeType
  scopePage?: string | number | null
  scopeCategory?: string | number | null
  scopePageType?: string | null
  modules: PayloadPageBlock[]
  brandDisplay?: HeaderBrandDisplay
  logo?: string | null
  copyrightText?: string | null
  tagline?: string | null
}

export async function listFooters(locale: string = "fr"): Promise<PayloadFooterSummary[]> {
  const res = await payloadFetch(`/footer?where[tenant][equals]=${PAYLOAD_TENANT_ID}&depth=1&limit=200&sort=-updatedAt&locale=${locale}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listFooters failed (${res.status})`)
  }
  const data = await res.json()
  return data.docs as PayloadFooterSummary[]
}

export async function getFooter(id: string | number, locale: string = "fr"): Promise<PayloadFooterDoc> {
  const res = await payloadFetch(`/footer/${id}?depth=1&locale=${locale}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: getFooter(${id}) failed (${res.status})`)
  }
  const data = (await res.json()) as PayloadFooterDoc & { logo?: unknown }
  return { ...data, logo: unpackImage(data.logo) }
}

export async function createFooter(input: FooterWriteInput, locale: string = "fr"): Promise<PayloadFooterDoc> {
  const { logo, ...rest } = input
  const res = await payloadFetch(`/footer?locale=${locale}`, {
    method: "POST",
    body: JSON.stringify({
      ...rest,
      ...(logo !== undefined ? { logo: logo ? await resolveMediaIdByUrl(logo) : null } : {}),
      tenant: PAYLOAD_TENANT_ID,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: createFooter`, res.status, body))
  }
  const data = await res.json()
  return { ...(data.doc as PayloadFooterDoc), logo: unpackImage(data.doc.logo) }
}

export async function updateFooter(id: string | number, input: FooterWriteInput, locale: string = "fr"): Promise<PayloadFooterDoc> {
  const { logo, ...rest } = input
  const res = await payloadFetch(`/footer/${id}?locale=${locale}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...rest,
      ...(logo !== undefined ? { logo: logo ? await resolveMediaIdByUrl(logo) : null } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: updateFooter(${id})`, res.status, body))
  }
  const data = await res.json()
  return { ...(data.doc as PayloadFooterDoc), logo: unpackImage(data.doc.logo) }
}

export async function deleteFooter(id: string | number): Promise<void> {
  const res = await payloadFetch(`/footer/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: deleteFooter(${id})`, res.status, body))
  }
}

// ─── Modules ────────────────────────────────────────────────────────────────
// Reusable content injected at a specific position inside a page (Charles,
// 2026-07-14) — same ScopeFields as Header/Footer, plus `anchorKey` (a scope
// can hold several Modules, one per anchor) and `content`, which reuses
// Pages' own block shape/registry verbatim — same fromPayloadBlock/
// toPayloadBlock read/write conversion `layout` already uses.

export interface PayloadModuleSummary extends ScopeFields {
  id: string | number
  label: string
  anchorKey: string
  updatedAt: string
}

export interface PayloadModuleDoc extends PayloadModuleSummary {
  content: PayloadPageBlock[]
}

export interface ModuleWriteInput {
  scopeType: ScopeType
  scopePage?: string | number | null
  scopeCategory?: string | number | null
  scopePageType?: string | null
  anchorKey: string
  content: PayloadPageBlock[]
}

/** Modules are typically few per tenant (like Header/Footer) — no pagination needed. */
export async function listModules(locale: string = "fr"): Promise<PayloadModuleSummary[]> {
  const res = await payloadFetch(`/modules?where[tenant][equals]=${PAYLOAD_TENANT_ID}&depth=1&limit=200&sort=-updatedAt&locale=${locale}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listModules failed (${res.status})`)
  }
  const data = await res.json()
  return data.docs as PayloadModuleSummary[]
}

export async function getModule(id: string | number, locale: string = "fr"): Promise<PayloadModuleDoc> {
  const res = await payloadFetch(`/modules/${id}?depth=1&locale=${locale}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: getModule(${id}) failed (${res.status})`)
  }
  const data = (await res.json()) as PayloadModuleDoc
  return { ...data, content: (data.content ?? []).map(fromPayloadBlock) }
}

export async function createModule(input: ModuleWriteInput, locale: string = "fr"): Promise<PayloadModuleDoc> {
  const res = await payloadFetch(`/modules?locale=${locale}`, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      content: await Promise.all(input.content.map(toPayloadBlock)),
      tenant: PAYLOAD_TENANT_ID,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: createModule`, res.status, body))
  }
  const data = await res.json()
  return { ...(data.doc as PayloadModuleDoc), content: (data.doc.content ?? []).map(fromPayloadBlock) }
}

export async function updateModule(id: string | number, input: ModuleWriteInput, locale: string = "fr"): Promise<PayloadModuleDoc> {
  const res = await payloadFetch(`/modules/${id}?locale=${locale}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...input,
      content: await Promise.all(input.content.map(toPayloadBlock)),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: updateModule(${id})`, res.status, body))
  }
  const data = await res.json()
  return { ...(data.doc as PayloadModuleDoc), content: (data.doc.content ?? []).map(fromPayloadBlock) }
}

export async function deleteModule(id: string | number): Promise<void> {
  const res = await payloadFetch(`/modules/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: deleteModule(${id})`, res.status, body))
  }
}

export interface PayloadBlogPostSummary {
  id: string | number
  title: string
  slug: string
  // Populated at depth=1 (see listBlogPosts) — was typed as a bare id,
  // never true at runtime for this call (same fix as PayloadPageSummary.parent).
  category: string | number | { id: string | number; name?: string; path?: string } | null
  excerpt?: string | null
  publishedAt?: string | null
  _status: "draft" | "published"
  createdAt: string
  updatedAt: string
  syncStatus?: PayloadSyncStatus | null
  // Populated at depth=1 (see listBlogPosts) and unpacked to a plain
  // absolute URL by unpackImage — same shape as every other imageUrl field
  // in this bridge, not Payload's raw {id, url} relation object. Doubles as
  // this collection's header/SEO image (BlogPostWriteInput.coverImage,
  // og:image/twitter — see blog/[slug]/page.tsx) rather than adding a
  // second, competing plugin-seo meta.image field.
  coverImage?: string
  // Same field as PayloadPageSummary.author (payload-cms's BlogPosts.ts
  // has one too) — was never typed here, so the Content Hub's merged
  // Pages+Articles table silently lost the Author column for articles
  // when the three separate tabs became one (Charles, 2026-07-15: "qui
  // lui a perdu sa colonne").
  author?: { id: string | number; email: string; name?: string | null } | null
}

export interface PayloadBlogPostDoc extends PayloadBlogPostSummary {
  body?: unknown
  seo?: { metaTitle?: string | null; metaDescription?: string | null; noIndex?: boolean | null; noFollow?: boolean | null }
  includeSiteNameInTitle?: boolean
  scheduledPublishAt?: string | null
  scheduledUnpublishAt?: string | null
}

export interface ListBlogPostsOptions {
  page?: number
  limit?: number
  category?: string | number
  /** Same rationale as ListPagesOptions.locale. */
  locale?: string
}

export async function listBlogPosts(
  options: ListBlogPostsOptions = {},
): Promise<PaginatedResult<PayloadBlogPostSummary>> {
  const { page = 1, limit = 20, category, locale = "fr" } = options
  const params = new URLSearchParams({
    "where[tenant][equals]": String(PAYLOAD_TENANT_ID),
    // depth=1 (was 0) so coverImage comes back as {id,url} for the
    // Content Hub table's thumbnail column instead of a bare ID.
    depth: "1",
    limit: String(limit),
    page: String(page),
    sort: "-publishedAt",
    locale,
    // Same fallback-disabling as listPages — an untranslated article's
    // `title` comes back empty instead of silently repeating French.
    "fallback-locale": "none",
  })
  if (category) params.set("where[category][equals]", String(category))

  const res = await payloadFetch(`/blog-posts?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listBlogPosts failed (${res.status})`)
  }
  const data = (await res.json()) as PaginatedResult<PayloadBlogPostSummary>
  return {
    ...data,
    docs: data.docs.map((doc) => ({ ...(metaToSeo(doc) as unknown as PayloadBlogPostSummary), coverImage: unpackImage(doc.coverImage) })),
  }
}

export async function getBlogPost(id: string | number, locale: string = "fr"): Promise<PayloadBlogPostDoc> {
  const res = await payloadFetch(`/blog-posts/${id}?depth=1&locale=${locale}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: getBlogPost(${id}) failed (${res.status})`)
  }
  const doc = (await res.json()) as PayloadBlogPostDoc
  return { ...(metaToSeo(doc) as unknown as PayloadBlogPostDoc), coverImage: unpackImage(doc.coverImage) }
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
  seo?: { metaTitle?: string; metaDescription?: string; noIndex?: boolean; noFollow?: boolean }
  includeSiteNameInTitle?: boolean
  scheduledPublishAt?: string | null
  scheduledUnpublishAt?: string | null
  // This collection's header/SEO image — Payload's own `coverImage` field
  // (not plugin-seo's meta.image, which the plugin also adds to this
  // collection but is deliberately left unused here, see payload.config.ts).
  coverImage?: string | null
  _status: "draft" | "published"
}

export async function createBlogPost(input: BlogPostWriteInput, locale: string = "fr"): Promise<PayloadBlogPostDoc> {
  const { coverImage, ...rest } = input
  const res = await payloadFetch(`/blog-posts?locale=${locale}${draftQueryParam(input._status)}`, {
    method: "POST",
    body: JSON.stringify({
      ...seoToMetaBody(rest),
      ...(coverImage !== undefined ? { coverImage: coverImage ? await resolveMediaIdByUrl(coverImage) : null } : {}),
      tenant: PAYLOAD_TENANT_ID,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: createBlogPost`, res.status, body))
  }
  const data = await res.json()
  return { ...(metaToSeo(data.doc) as unknown as PayloadBlogPostDoc), coverImage: unpackImage(data.doc.coverImage) }
}

// Same fix as updatePage — locale wasn't forwarded, so an edit always wrote fr.
export async function updateBlogPost(
  id: string | number,
  input: Partial<BlogPostWriteInput>,
  locale: string = "fr",
): Promise<PayloadBlogPostDoc> {
  const { coverImage, ...rest } = input
  const res = await payloadFetch(`/blog-posts/${id}?locale=${locale}${draftQueryParam(input._status)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...seoToMetaBody(rest),
      ...(coverImage !== undefined ? { coverImage: coverImage ? await resolveMediaIdByUrl(coverImage) : null } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: updateBlogPost(${id})`, res.status, body))
  }
  const data = await res.json()
  return { ...(metaToSeo(data.doc) as unknown as PayloadBlogPostDoc), coverImage: unpackImage(data.doc.coverImage) }
}

/** Same rationale as deletePage — target site is already deactivated by the sync hook first. */
export async function deleteBlogPost(id: string | number): Promise<void> {
  const res = await payloadFetch(`/blog-posts/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: deleteBlogPost(${id})`, res.status, body))
  }
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

export async function listCollection<T = Record<string, unknown>>(
  slug: string,
  searchParams: URLSearchParams,
): Promise<PayloadListResult<T>> {
  const res = await payloadFetch(`/${slug}?${searchParams.toString()}`)
  if (!res.ok) {
    throw new Error(`Payload bridge: listCollection(${slug}) failed (${res.status})`)
  }
  return res.json()
}

// Charles (2026-07-09): "on doit avoir une vignette preview depuis chaque
// champs media" — payload-cms's Media collection (upload: true, access.read
// public) has no dedicated bridge helper yet, every imageUrl/videoUrl field
// in Content Hub is a bare text input. Tenant-scoped the same way
// listPages/listBlogPosts are (plugin-multi-tenant auto-injects `tenant`,
// never declared in Media.ts itself).
export interface PayloadMediaSummary {
  id: string | number
  filename: string
  alt?: string | null
  url: string
  mimeType?: string | null
  filesize?: number | null
  width?: number | null
  height?: number | null
  // Payload adds this to every doc automatically; wasn't declared here
  // since nothing read it — needed now for Media Gallery's date sort.
  createdAt?: string | null
}

export interface ListMediaOptions {
  limit?: number
  search?: string
}

// Payload's config has no `serverURL` set, so an upload's `url` comes back
// relative ("/api/media/file/xxx.jpg") — fine for the Payload admin itself
// (same origin) but resolves against neosaas-v2's own origin everywhere
// else, 404ing. Confirmed live 2026-07-09: MediaPickerField's own thumbnail
// broke on this exact issue. Made absolute here, once, since this is the
// only place in neosaas-v2 that lists raw Media docs — extractMediaUrl
// (lib/layers/from-payload.ts) and mapBlockToProps (payload-cms's own
// neosaas-app.ts) read `image.url` off already-populated relation fields on
// Pages/BlogPosts, a separate path this fix doesn't touch.
const PAYLOAD_ORIGIN = PAYLOAD_API_URL?.replace(/\/api\/?$/, "")

export async function listMedia(options: ListMediaOptions = {}): Promise<PayloadListResult<PayloadMediaSummary>> {
  const { limit = 100, search } = options
  const params = new URLSearchParams({
    "where[tenant][equals]": String(PAYLOAD_TENANT_ID),
    limit: String(limit),
    sort: "-createdAt",
  })
  if (search) params.set("where[filename][contains]", search)
  const result = await listCollection<PayloadMediaSummary>("media", params)
  return {
    ...result,
    docs: result.docs.map((doc) => ({
      ...doc,
      url: doc.url && doc.url.startsWith("/") && PAYLOAD_ORIGIN ? `${PAYLOAD_ORIGIN}${doc.url}` : doc.url,
    })),
  }
}

/**
 * Uploads a file into Payload's Media collection — the same collection
 * MediaPickerField/listMedia already read from, previously only writable
 * via Payload's own native admin (Charles, 2026-07-11: "on a un lien
 * direct vers payload. c'est pas génial. je dois avoir les mêmes
 * fonctionnalités de neosaas app depuis l'ui"). Deliberately bypasses
 * payloadFetch() — it hardcodes `Content-Type: application/json`, which
 * breaks a multipart upload (the browser/runtime needs to set its own
 * boundary). `tenant` is appended as a plain form field, same value
 * every other create call here sends as JSON — Payload's REST API accepts
 * non-file fields alongside the file in the same multipart body.
 */
export async function uploadMedia(file: File, alt?: string): Promise<PayloadMediaSummary> {
  assertConfigured()
  const formData = new FormData()
  formData.append("file", file)
  // Payload's REST API multipart convention: non-file fields must ride in a
  // single `_payload` JSON string alongside the file, not as individual
  // form fields — appending `tenant`/`alt` directly 400s with "This field
  // is required" even though the value is right there in the form data.
  formData.append("_payload", JSON.stringify({ tenant: PAYLOAD_TENANT_ID, alt: alt ?? undefined }))

  const res = await fetch(`${PAYLOAD_API_URL}/media`, {
    method: "POST",
    headers: { Authorization: `users API-Key ${PAYLOAD_SERVICE_API_KEY}` },
    body: formData,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: uploadMedia`, res.status, body))
  }
  const data = await res.json()
  const doc = data.doc as PayloadMediaSummary
  return { ...doc, url: doc.url && doc.url.startsWith("/") && PAYLOAD_ORIGIN ? `${PAYLOAD_ORIGIN}${doc.url}` : doc.url }
}

export async function deleteMedia(id: string | number): Promise<void> {
  const res = await payloadFetch(`/media/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: deleteMedia(${id})`, res.status, body))
  }
}

/**
 * Fetches an already-uploaded image's bytes server-side and returns them as
 * a data: URL — the escape hatch for feeding an existing S3-hosted image
 * into ImageCropper (react-easy-crop), which only ever received data URLs
 * before (CroppedFileInput's FileReader.readAsDataURL, same-origin by
 * construction). Loading the raw Scaleway S3 url directly into a canvas
 * client-side risks a CORS-tainted canvas depending on the bucket's CORS
 * config; a server-side fetch has no such restriction (same trick
 * mediaTransformHandler already uses to refetch doc.url before a Sharp
 * transform), and the result is same-origin data once it reaches the
 * browser.
 */
export async function fetchMediaAsDataUrl(id: string | number): Promise<{ dataUrl: string; mimeType: string }> {
  const res = await payloadFetch(`/media/${id}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Payload bridge: fetchMediaAsDataUrl(${id}) failed to load doc (${res.status}): ${body}`)
  }
  const doc = (await res.json()) as PayloadMediaSummary
  if (!doc.url) throw new Error(`Payload bridge: fetchMediaAsDataUrl(${id}) — doc has no url`)
  const absoluteUrl = doc.url.startsWith("/") && PAYLOAD_ORIGIN ? `${PAYLOAD_ORIGIN}${doc.url}` : doc.url
  const fileRes = await fetch(absoluteUrl)
  if (!fileRes.ok) throw new Error(`Payload bridge: fetchMediaAsDataUrl(${id}) — could not fetch file bytes (${fileRes.status})`)
  const buffer = Buffer.from(await fileRes.arrayBuffer())
  const mimeType = doc.mimeType ?? fileRes.headers.get("content-type") ?? "image/jpeg"
  return { dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`, mimeType }
}

/**
 * Replaces an already-uploaded Media doc's actual pixel content in place —
 * the crop result (a Blob from ImageCropper) is uploaded through the same
 * multipart path as a fresh upload, but PATCHed against the existing doc id
 * instead of POSTed as a new one, so the doc's id/alt/url slug are kept and
 * only the underlying file changes. Same _payload convention as uploadMedia
 * (Payload's REST multipart quirk: non-file fields must ride in a single
 * JSON string field, not as individual form fields).
 */
export async function replaceMediaFile(id: string | number, file: File): Promise<PayloadMediaSummary> {
  assertConfigured()
  const formData = new FormData()
  formData.append("file", file)
  formData.append("_payload", JSON.stringify({}))
  const res = await fetch(`${PAYLOAD_API_URL}/media/${id}`, {
    method: "PATCH",
    headers: { Authorization: `users API-Key ${PAYLOAD_SERVICE_API_KEY}` },
    body: formData,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: replaceMediaFile(${id})`, res.status, body))
  }
  const data = await res.json()
  const doc = data.doc as PayloadMediaSummary
  return { ...doc, url: doc.url && doc.url.startsWith("/") && PAYLOAD_ORIGIN ? `${PAYLOAD_ORIGIN}${doc.url}` : doc.url }
}

export interface MediaTransformInput {
  rotate?: number
  flip?: "horizontal" | "vertical"
  width?: number
  height?: number
  quality?: number
}

/**
 * Applies an in-place transform (rotate/flip/resize/quality) to an
 * already-uploaded image — proxies payload-cms's existing
 * `POST /api/media/:id/transform` endpoint (src/endpoints/mediaTransform.ts,
 * Sharp-based, already functional, previously only reachable from Payload's
 * own admin via MediaTransformControls). Images only — video isn't
 * supported by that endpoint yet (needs ffmpeg, a separate backend task).
 */
export async function transformMedia(id: string | number, input: MediaTransformInput): Promise<PayloadMediaSummary> {
  const res = await payloadFetch(`/media/${id}/transform`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: transformMedia(${id})`, res.status, body))
  }
  const data = await res.json()
  const doc = (data.doc ?? data) as PayloadMediaSummary
  return { ...doc, url: doc.url && doc.url.startsWith("/") && PAYLOAD_ORIGIN ? `${PAYLOAD_ORIGIN}${doc.url}` : doc.url }
}

/**
 * Renames the underlying file of an already-uploaded Media doc — proxies
 * payload-cms's `POST /api/media/:id/rename` (src/endpoints/mediaRename.ts).
 * Unlike `alt` (a plain metadata PATCH via updateCollectionDoc), the
 * filename is part of the doc's public `url`, so it needs the dedicated
 * endpoint that re-runs Payload's own upload path instead of a bare field
 * PATCH (which would desync the DB filename from the actual S3 object).
 * Works for any mimetype — PDFs included, the actual motivating case
 * (Charles, 2026-07-11: PDFs "doivent être publiables avec une URL... on ne
 * peut agir sur le nom des fichiers").
 */
export async function renameMedia(id: string | number, filename: string): Promise<PayloadMediaSummary> {
  const res = await payloadFetch(`/media/${id}/rename`, {
    method: "POST",
    body: JSON.stringify({ filename }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: renameMedia(${id})`, res.status, body))
  }
  const data = await res.json()
  const doc = (data.doc ?? data) as PayloadMediaSummary
  return { ...doc, url: doc.url && doc.url.startsWith("/") && PAYLOAD_ORIGIN ? `${PAYLOAD_ORIGIN}${doc.url}` : doc.url }
}

/**
 * Plain metadata update (alt text only so far) — a normal PATCH via
 * updateCollectionDoc, no file involved, so no risk of desyncing storage.
 */
export async function updateMediaAlt(id: string | number, alt: string): Promise<PayloadMediaSummary> {
  const doc = (await updateCollectionDoc("media", id, { alt })) as unknown as PayloadMediaSummary
  return { ...doc, url: doc.url && doc.url.startsWith("/") && PAYLOAD_ORIGIN ? `${PAYLOAD_ORIGIN}${doc.url}` : doc.url }
}

export async function createCollectionDoc(
  slug: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await payloadFetch(`/${slug}`, { method: "POST", body: JSON.stringify(data) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatPayloadError(`Payload bridge: createCollectionDoc(${slug})`, res.status, body))
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
    throw new Error(formatPayloadError(`Payload bridge: updateCollectionDoc(${slug}, ${id})`, res.status, body))
  }
  const result = await res.json()
  return result.doc
}

// ─── Tenant theme push-back (Charles, 2026-07-15) ──────────────────────────
// Payload's Tenant "Couleurs" tab (colorPaletteFields.ts) already syncs ONE
// way — Tenant save → payload-cms's syncTenantThemeToNeosaasApp writes
// straight into this app's `platform_config` row. Saving the palette here
// in theme-settings.tsx never went back the other way, so the Tenant form
// silently went stale the moment someone edited colors from neosaas-app
// instead ("je pilote de plus en plus depuis neosaas"). This closes that
// loop: same 12 color roles, HSL (this app's storage format) converted back
// to HEX (Tenant's format) — the exact inverse of payload-cms's own
// hexToHslTriplet. Best-effort only: theme_config here is already the
// live source for the public site regardless of whether this push succeeds.
const THEME_COLOR_ROLES = [
  "primary", "primaryForeground", "secondary", "secondaryForeground",
  "accent", "accentForeground", "background", "foreground",
  "border", "success", "warning", "destructive",
] as const

function hslTripletToHex(hsl: string): string | undefined {
  const match = /^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/.exec(hsl.trim())
  if (!match) return undefined
  const h = Number(match[1])
  const s = Number(match[2]) / 100
  const l = Number(match[3]) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function paletteToHex(palette: Record<string, string> | undefined): Record<string, string> {
  if (!palette) return {}
  const result: Record<string, string> = {}
  for (const role of THEME_COLOR_ROLES) {
    const hsl = palette[role]
    if (typeof hsl === "string" && hsl.trim()) {
      const hex = hslTripletToHex(hsl)
      if (hex) result[role] = hex
    }
  }
  return result
}

export async function pushThemeColorsToTenant(colors: {
  light: Record<string, string>
  dark: Record<string, string>
}): Promise<void> {
  if (!PAYLOAD_TENANT_ID) return
  await updateCollectionDoc("tenants", PAYLOAD_TENANT_ID, {
    colorsLight: paletteToHex(colors.light),
    colorsDark: paletteToHex(colors.dark),
  })
}
