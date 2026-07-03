import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { LOCALES } from '@/app/[locale]/layout'

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

const DEFAULT_LOCALE = "fr"

// Only the routes that actually moved under app/[locale]/(public) — auth,
// admin, dashboard, api, and the (errors) pages stay unlocalized and must
// never be redirected here, so this is a positive allowlist rather than a
// negative exclusion (safer: a route this list forgets just 404s instead of
// silently being redirected somewhere wrong).
const PUBLIC_LOCALIZED_PREFIXES = [
  "/book",
  "/brand",
  "/configuration",
  "/dashboard-exemple",
  "/demo",
  "/docs",
  "/features",
  "/legacy",
  "/legal",
  "/pricing",
  "/store",
]

function needsLocaleRedirect(path: string): boolean {
  const alreadyLocalized = LOCALES.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`))
  if (alreadyLocalized) return false

  const isPublicRoot = path === "/"
  const isPublicPrefixed = PUBLIC_LOCALIZED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  return isPublicRoot || isPublicPrefixed
}

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

  // i18n: bare public routes (no /fr or /en prefix) redirect to the default
  // locale — e.g. /features -> /fr/features. Auth/admin/dashboard/api/errors
  // routes are untouched (see PUBLIC_LOCALIZED_PREFIXES above).
  if (needsLocaleRedirect(path)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${DEFAULT_LOCALE}${path === "/" ? "" : path}`
    return NextResponse.redirect(url)
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
