import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/auth/admin-auth"
import { executePilotRequest } from "@/lib/mcp/pilot-executor"
import { pilotRequestSchema } from "@/lib/pilot/actions"

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: authResult.isAuthenticated ? 403 : 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = pilotRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid PilotRequest", details: parsed.error.format() },
      { status: 400 },
    )
  }

  const execution = await executePilotRequest({
    actions: parsed.data.actions,
    dryRun: parsed.data.dryRun,
    actorUserId: authResult.userId,
    actorType: "human",
    skipAudit: parsed.data.dryRun,
  })

  return NextResponse.json(execution)
}
