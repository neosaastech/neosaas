import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { featureRegistry } from "@/lib/dashboard/feature-registry"
import { listCollection, createCollectionDoc } from "@/lib/payload-bridge"

/**
 * Generic proxy for Metadata-Driven UI dashboard features
 * (types/form-builder.ts) — the only thing allowed to hold the Payload
 * service credential (lib/payload-bridge.ts); DynamicTable/DynamicForm
 * never call Payload directly from the browser.
 *
 * Admin/super_admin only, by default, for every feature registered here —
 * Payload collections aren't scoped by NeoSaaS "company" the way this
 * app's own data is, so opening this up to any authenticated user would
 * leak one company's records to another until a feature adds its own
 * scoping. Tighten per-feature once a real one needs broader access.
 */
async function requireAdminUser() {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return null
  }
  return currentUser
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params
  const config = featureRegistry[feature]
  if (!config) {
    return NextResponse.json({ error: "Unknown feature" }, { status: 404 })
  }

  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  try {
    const result = await listCollection(config.endpoint, searchParams)
    return NextResponse.json(result)
  } catch (error) {
    console.error(`Failed to list ${config.endpoint}:`, error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 502 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params
  const config = featureRegistry[feature]
  if (!config) {
    return NextResponse.json({ error: "Unknown feature" }, { status: 404 })
  }

  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const body = await request.json()
  try {
    const doc = await createCollectionDoc(config.endpoint, body)
    return NextResponse.json({ doc })
  } catch (error) {
    console.error(`Failed to create ${config.endpoint}:`, error)
    return NextResponse.json({ error: "Failed to save" }, { status: 502 })
  }
}
