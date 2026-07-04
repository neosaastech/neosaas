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
