import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { featureRegistry } from "@/lib/dashboard/feature-registry"
import { updateCollectionDoc } from "@/lib/payload-bridge"

async function requireAdminUser() {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    return null
  }
  return currentUser
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feature: string; id: string }> },
) {
  const { feature, id } = await params
  const config = featureRegistry[feature]
  if (!config) {
    return NextResponse.json({ error: "Unknown feature" }, { status: 404 })
  }

  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const body = await request.json()
  try {
    const doc = await updateCollectionDoc(config.endpoint, id, body)
    return NextResponse.json({ doc })
  } catch (error) {
    console.error(`Failed to update ${config.endpoint}/${id}:`, error)
    return NextResponse.json({ error: "Failed to save" }, { status: 502 })
  }
}
