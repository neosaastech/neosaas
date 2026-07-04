import { jwtVerify } from "jose"
import { hasRole } from "./server"

/**
 * Access-level threshold for the unified Pages model (Payload-authored
 * public content + this app's own internal/backend pages, fused per
 * Charles's 2026-07-04 decision — see Notion "Payload CMS multi-site").
 * Ordered low to high; a page's `requiredRole` is the minimum needed.
 */
export const REQUIRED_ROLE_LEVELS = ["public", "user", "admin", "super_admin"] as const
export type RequiredRoleLevel = (typeof REQUIRED_ROLE_LEVELS)[number]

/**
 * Platform roles (from the `roles` table) that satisfy a given threshold.
 * Deliberately NOT the ad-hoc `includes("admin") || includes("super_admin")`
 * pattern used elsewhere in this codebase (30+ call sites) — that pattern
 * treats admin and super_admin as equivalent everywhere, which is exactly
 * what a `requiredRole: "super_admin"` page must NOT do (an admin account
 * must not see/reach it). "public"/"user" don't gate on a specific platform
 * role at all — see canAccessPage.
 */
function allowedRoleNamesFor(requiredRole: RequiredRoleLevel): string[] {
  switch (requiredRole) {
    case "super_admin":
      return ["super_admin"]
    case "admin":
      return ["admin", "super_admin"]
    default:
      return []
  }
}

/**
 * Whether a user (possibly anonymous) may access a page with the given
 * `requiredRole` threshold. Reuses the existing, already-correct `hasRole`
 * (lib/auth/server.ts) as the actual DB check — this function only adds the
 * public/user/admin/super_admin threshold semantics on top, it doesn't
 * duplicate role-checking logic.
 */
export async function canAccessPage(
  userId: string | null,
  requiredRole: RequiredRoleLevel,
): Promise<boolean> {
  if (requiredRole === "public") return true
  if (!userId) return false
  if (requiredRole === "user") return true
  return hasRole(userId, allowedRoleNamesFor(requiredRole))
}

/**
 * Longest-prefix match against `page_permissions`, respecting path segment
 * boundaries (so "/admin-tools" never matches an "/admin" entry). Dynamic
 * sub-routes not explicitly listed (e.g. /admin/products/[id]) inherit
 * their closest listed ancestor's level — this is deliberate, most
 * sub-routes should inherit rather than needing an explicit row each.
 */
export function findRequiredRoleForPath(
  pathname: string,
  permissions: { path: string; access: string }[],
): RequiredRoleLevel {
  let best: { path: string; access: string } | null = null
  for (const perm of permissions) {
    const isMatch =
      pathname === perm.path || pathname.startsWith(perm.path.endsWith("/") ? perm.path : perm.path + "/")
    if (isMatch && (!best || perm.path.length > best.path.length)) {
      best = perm
    }
  }
  const access = best?.access ?? "public"
  return (REQUIRED_ROLE_LEVELS as readonly string[]).includes(access) ? (access as RequiredRoleLevel) : "public"
}

/**
 * Cached `page_permissions` read for use in proxy.ts — same 5-minute cache
 * pattern already established there (shouldForceHttps) rather than hitting
 * the DB on every single request.
 */
let cachedPermissions: { path: string; access: string }[] | null = null
let permissionsCacheTimestamp = 0
const PERMISSIONS_CACHE_TTL = 5 * 60 * 1000

export async function getCachedPagePermissions(): Promise<{ path: string; access: string }[]> {
  const now = Date.now()
  if (cachedPermissions && now - permissionsCacheTimestamp < PERMISSIONS_CACHE_TTL) {
    return cachedPermissions
  }
  try {
    const { db } = await import("@/db")
    const { pagePermissions } = await import("@/db/schema")
    const rows = await db.select({ path: pagePermissions.path, access: pagePermissions.access }).from(pagePermissions)
    cachedPermissions = rows
    permissionsCacheTimestamp = now
    return rows
  } catch (error) {
    console.error("[page-access] Failed to load page_permissions:", error)
    // Fail open on the CACHED value if we have one (stale beats a full
    // outage), otherwise fail open to an empty list (nothing gets blocked —
    // the pre-existing admin-layout blanket gate is still the real backstop).
    return cachedPermissions ?? []
  }
}

/**
 * Decode the auth cookie to a userId only — never trusts roles from the
 * JWT (matches lib/auth/server.ts's own principle: roles are always
 * re-checked fresh from the DB via canAccessPage/hasRole, since a JWT can
 * outlive a role change made mid-session).
 */
export async function getUserIdFromToken(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return (payload as { userId?: string }).userId ?? null
  } catch {
    return null
  }
}
