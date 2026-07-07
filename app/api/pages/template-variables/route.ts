import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { buildPageTemplateContext } from "@/lib/pages/template-variables"

/** Preview + editor: current template variable values for the active session. */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") || "fr"
  const variables = await buildPageTemplateContext(locale)
  return NextResponse.json(variables)
}
