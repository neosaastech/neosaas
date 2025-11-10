import { NextResponse } from "next/server"
import { getAvailableProviders } from "@/lib/auth"

export async function GET() {
  const providers = getAvailableProviders()
  return NextResponse.json(providers)
}
