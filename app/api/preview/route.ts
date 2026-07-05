import { draftMode } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

/**
 * Entry point Payload's Live Preview iframe opens (see payload-cms's
 * payload.config.ts admin.livePreview.url). Validates the shared
 * PREVIEW_SECRET, enables Next.js Draft Mode, and redirects to the actual
 * page — which then fetches straight from Payload instead of this site's
 * own page_layers table (see [...slug]/page.tsx's draftMode() branch).
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  const path = request.nextUrl.searchParams.get("path") || "/"
  const locale = request.nextUrl.searchParams.get("locale") || "fr"

  if (!process.env.PREVIEW_SECRET || secret !== process.env.PREVIEW_SECRET) {
    return new Response("Invalid preview secret", { status: 401 })
  }

  const draft = await draftMode()
  draft.enable()

  redirect(`/${locale}${path}`)
}
