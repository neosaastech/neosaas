import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { redirect } from "next/navigation"

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key-here-change-in-production"

export interface AuthUser {
  userId: string
  email: string
  roles?: string[]
  permissions?: string[]
  [key: string]: any
}

/**
 * Verify JWT token from cookies
 * This replaces the middleware auth logic for Next.js 16
 */
export async function verifyAuth(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) {
    return null
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload as AuthUser
  } catch (error) {
    console.error("JWT verification failed:", error)
    return null
  }
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use this in server components/layouts for protected routes
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await verifyAuth()
  
  if (!user) {
    redirect("/auth/login")
  }
  
  return user
}

/**
 * Get user roles from database
 * Returns the list of role names for the authenticated user
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const { db } = await import("@/db")
    const { userRoles, roles } = await import("@/db/schema")
    const { eq } = await import("drizzle-orm")

    console.log("[AUTH] Fetching roles for user:", userId)

    const userRolesData = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId))

    const roleNames = userRolesData.map((r) => r.roleName)
    console.log("[AUTH] User roles found:", roleNames)

    return roleNames
  } catch (error) {
    console.error("Error fetching user roles:", error)
    return []
  }
}

/**
 * Check if user has any of the specified roles
 */
export async function hasRole(userId: string, allowedRoles: string[]): Promise<boolean> {
  const userRoles = await getUserRoles(userId)
  const hasAccess = userRoles.some((role) => allowedRoles.includes(role))
  console.log("[AUTH] Checking if user has roles", allowedRoles, "- Result:", hasAccess)
  return hasAccess
}

/**
 * Check if user is admin or super_admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return await hasRole(userId, ["admin", "super_admin"])
}

/**
 * Check if user is super_admin only
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return await hasRole(userId, ["super_admin"])
}

/**
 * Require admin access - redirects to dashboard if not admin
 * Checks roles from database for accurate, real-time verification
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()

  console.log("[AUTH] Checking admin access for user:", user.userId, user.email)

  // Check roles from database (not from JWT token which may be outdated)
  const admin = await isAdmin(user.userId)

  console.log("[AUTH] Is admin?", admin)

  if (!admin) {
    console.log("[AUTH] Access denied - redirecting to /dashboard")
    redirect("/dashboard")
  }

  console.log("[AUTH] Access granted to admin area")
  return user
}

/**
 * Require super_admin access - redirects to dashboard if not super_admin
 * Use this for sensitive operations like user management
 */
export async function requireSuperAdmin(): Promise<AuthUser> {
  const user = await requireAuth()

  console.log("[AUTH] Checking super_admin access for user:", user.userId, user.email)

  // Check roles from database (not from JWT token which may be outdated)
  const superAdmin = await isSuperAdmin(user.userId)

  console.log("[AUTH] Is super_admin?", superAdmin)

  if (!superAdmin) {
    console.log("[AUTH] Super admin access denied - redirecting to /dashboard")
    redirect("/dashboard")
  }

  console.log("[AUTH] Access granted to super_admin area")
  return user
}

/**
 * Check if user is authenticated
 * Use this to conditionally redirect authenticated users away from auth pages
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await verifyAuth()
  return user !== null
}

/**
 * Get current user or null
 * Use this when you want to check auth without redirecting
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  return await verifyAuth()
}
