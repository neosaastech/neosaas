import { NextResponse } from "next/server"
import { db, validateDatabaseUrl } from "@/db"
import { users, userRoles, roles, rolePermissions, permissions } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { isOfflineDev } from "@/lib/dev/offline-mode"
import { OFFLINE_AUTH_ME_USER } from "@/lib/dev/mock-data"

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (isOfflineDev()) {
      return NextResponse.json({ user: OFFLINE_AUTH_ME_USER })
    }

    validateDatabaseUrl()

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId),
      with: {
        company: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const companySummary = user.company
      ? {
          ...user.company,
          hasLogo: !!user.company.logo,
        }
      : null
    const userRolesData = await db
      .select({
        roleName: roles.name,
        roleDescription: roles.description,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id))

    const userPermissionsData = await db
      .select({
        permissionName: permissions.name,
        permissionDescription: permissions.description,
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, user.id))

    const uniquePermissions = userPermissionsData.reduce(
      (acc, curr) => {
        if (!acc.find((p) => p.permissionName === curr.permissionName)) {
          acc.push(curr)
        }
        return acc
      },
      [] as typeof userPermissionsData,
    )

    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        company: companySummary,
        roles: userRolesData,
        permissions: uniquePermissions,
      },
    })
  } catch (error) {
    console.error("Get current user error:", error)
    return NextResponse.json({ error: "An error occurred while fetching user data" }, { status: 500 })
  }
}
