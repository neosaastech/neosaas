import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Next.js 16 Proxy Configuration
 * 
 * This file replaces middleware.ts and should only contain:
 * - Network rewrites
 * - Simple redirects
 * - Header modifications
 * 
 * Complex logic (auth, validation) should be in server components/functions.
 */

// Cache for configuration (refreshed every 5 minutes)
let cachedForceHttps = false
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function shouldForceHttps(): Promise<boolean> {
  const now = Date.now()
  
  // Return cached value if still valid
  if (cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedForceHttps
  }

  try {
    const [config] = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.key, 'force_https'))
      .limit(1)

    if (config?.value) {
      cachedForceHttps = config.value === 'true'
      cacheTimestamp = now
      return cachedForceHttps
    }
  } catch (error) {
    console.error('Failed to fetch force_https config:', error)
  }

  return false
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const protocol = request.headers.get('x-forwarded-proto') || 'http'

  // HTTPS Force Redirect
  const forceHttps = await shouldForceHttps()
  if (forceHttps && protocol === 'http') {
    const httpsUrl = new URL(request.url)
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, { status: 301 })
  }

  // Maintenance Mode - Simple Redirect
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true"

  if (isMaintenanceMode && !path.startsWith("/maintenance")) {
    // Allow access to static files
    if (!path.includes(".") && !path.startsWith("/_next")) {
      return NextResponse.redirect(new URL("/maintenance", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/profiles (user uploaded images)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|images/profiles).*)",
  ],
}
