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
  _status: "draft" | "published"
  updatedAt: string
}

/** Lists this tenant's own Pages only — never another site's. */
export async function listPages(): Promise<PayloadPageSummary[]> {
  const res = await payloadFetch(
    `/pages?where[tenant][equals]=${PAYLOAD_TENANT_ID}&depth=0&limit=100&sort=path`,
  )
  if (!res.ok) {
    throw new Error(`Payload bridge: listPages failed (${res.status})`)
  }
  const data = await res.json()
  return data.docs as PayloadPageSummary[]
}

export async function getPage(id: string | number): Promise<Record<string, unknown>> {
  const res = await payloadFetch(`/pages/${id}?depth=1`)
  if (!res.ok) {
    throw new Error(`Payload bridge: getPage(${id}) failed (${res.status})`)
  }
  return res.json()
}
