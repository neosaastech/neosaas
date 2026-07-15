import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { LOCALES } from '@/app/[locale]/layout'
import {
  canAccessPage,
  findRequiredRoleForPath,
  getCachedPagePermissions,
  getUserIdFromToken,
} from '@/lib/auth/page-access'

/**
 * Next.js 16 Proxy Configuration
 *
 * This file replaces middleware.ts and should only contain:
 * - Network rewrites
 * - Simple redirects
 * - Header modifications
 *
 * Complex logic (auth, validation) should be in server components/functions.
 *
 * Exception (2026-07-04): page_permissions.access enforcement. This is the
 * only point in the app that runs before every /admin and /dashboard
 * request regardless of which page component handles it, which is exactly
 * what closing the "page_permissions is cosmetic" gap requires — a
 * per-page server component check can't catch a request before it starts
 * rendering. All the actual logic lives in lib/auth/page-access.ts
 * (cached lookup, longest-prefix match, role check); this file only calls
 * it, kept intentionally thin.
 */
const ACCESS_CONTROLLED_PREFIXES = ["/admin", "/dashboard"]

async function enforcePageAccess(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname
  if (!ACCESS_CONTROLLED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null
  }

  const permissions = await getCachedPagePermissions()
  const requiredRole = findRequiredRoleForPath(path, permissions)
  if (requiredRole === "public") return null

  const userId = await getUserIdFromToken(request.cookies.get("auth-token")?.value)
  if (!userId) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }
  if (requiredRole === "user") return null

  const allowed = await canAccessPage(userId, requiredRole)
  if (!allowed) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return null
}

const DEFAULT_LOCALE = "fr"
const LOCALE_COOKIE = "preferred-locale"

// Bare-domain visits (neosaas.tech, no /fr or /en) used to hardcode /fr
// regardless of the visitor's browser — an English-speaking visitor always
// landed on the French home page. Parses the standard Accept-Language
// header (RFC 4647 quality values, e.g. "en-US,en;q=0.9,fr;q=0.8") and picks
// the first supported locale in preference order — falls back to
// DEFAULT_LOCALE if the header is missing/unparseable or names nothing we
// support.
function detectPreferredLocale(request: NextRequest): (typeof LOCALES)[number] {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (LOCALES.includes(cookieLocale as (typeof LOCALES)[number])) {
    return cookieLocale as (typeof LOCALES)[number]
  }

  const header = request.headers.get("accept-language")
  if (!header) return DEFAULT_LOCALE as (typeof LOCALES)[number]

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";q=")
      return { tag: tag.trim().toLowerCase(), quality: qPart ? parseFloat(qPart) : 1 }
    })
    .sort((a, b) => b.quality - a.quality)

  for (const { tag } of ranked) {
    const base = tag.split("-")[0]
    const match = LOCALES.find((locale) => locale === base)
    if (match) return match
  }
  return DEFAULT_LOCALE as (typeof LOCALES)[number]
}

// Was a positive allowlist of specific known static routes — broke the
// moment a page got created dynamically through the Content Hub (found
// 2026-07-04: a freshly-published page 404'd at its bare path instead of
// redirecting to /fr/<path>, because it obviously couldn't be in a
// hardcoded list written before it existed). Inverted to a denylist:
// admin/dashboard/auth/api/system routes are excluded by name, everything
// else is a candidate for locale redirect — matches how app/[locale]/(public)
// actually now includes a generic [...slug] catch-all for CMS pages, not
// just a fixed set of static ones.
const NEVER_LOCALIZED_PREFIXES = [
  "/admin",
  "/dashboard",
  "/auth",
  "/api",
  "/onboarding",
  "/maintenance",
  "/success",
  "/_next",
]

function needsLocaleRedirect(path: string): boolean {
  const alreadyLocalized = LOCALES.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`))
  if (alreadyLocalized) return false

  if (path.includes(".")) return false // static files (favicon.ico, images...)

  const isNeverLocalized = NEVER_LOCALIZED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  return !isNeverLocalized
}

// Cache for configuration (refreshed every 5 minutes)
let cachedForceHttps = false
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function shouldForceHttps(): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    return false
  }

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

  // HTTPS Force Redirect (skip on localhost — dev server has no TLS)
  const host = request.nextUrl.hostname
  const isLocalDev = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
  const forceHttps = await shouldForceHttps()
  if (forceHttps && protocol === 'http' && !isLocalDev) {
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
    const targetLocale = detectPreferredLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${targetLocale}${path === "/" ? "" : path}`
    const response = NextResponse.redirect(url)
    // Remembers an explicit choice so a later visit to the bare domain
    // doesn't re-run browser-language detection and flip the visitor back —
    // set once here (redirect from "/"), read by detectPreferredLocale above
    // and by the locale switcher (components/layout/... ) when a visitor
    // picks a language manually.
    response.cookies.set(LOCALE_COOKIE, targetLocale, { maxAge: 60 * 60 * 24 * 365, path: "/" })
    return response
  }

  const accessDenied = await enforcePageAccess(request)
  if (accessDenied) return accessDenied

  // <html lang> lives in the true root layout (app/layout.tsx), above the
  // [locale] segment, so it can't read params.locale directly — this header
  // is how it finds out. Was hardcoded to "en" unconditionally before this
  // (Charles, 2026-07-08: real SEO/accessibility bug on every /fr/ page).
  // Non-locale routes (admin/dashboard/auth) fall back to DEFAULT_LOCALE,
  // which is also more correct than the old hardcoded "en" for this
  // French-first app.
  const localeSegment = path.split("/")[1]
  const locale = LOCALES.includes(localeSegment as (typeof LOCALES)[number]) ? localeSegment : DEFAULT_LOCALE
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-locale", locale)
  // Read by app/[locale]/(public)/layout.tsx to resolve which Header/Footer
  // applies (Page > Category > PageType > Default, see app/actions/site-nav.ts)
  // — a shared layout has no other way to know the current route.
  requestHeaders.set("x-pathname", path)
  return NextResponse.next({ request: { headers: requestHeaders } })
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
