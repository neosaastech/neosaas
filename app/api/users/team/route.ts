import { NextResponse } from "next/server"
import { db, validateDatabaseUrl } from "@/db"
import { users, userRoles, roles, userInvitations } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { eq } from "drizzle-orm"

/**
 * GET /api/users/team
 * Fetch all users in current user's company with their roles
 */
export async function GET() {
  try {
    validateDatabaseUrl()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Fetch fresh user data to ensure we have the latest companyId
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId),
      columns: {
        companyId: true
      }
    });

    const companyId = dbUser?.companyId || currentUser.companyId;

    if (!companyId) {
       // If no company, return empty list or handle as needed
       return NextResponse.json({ users: [] });
    }

    const companyUsers = await db.query.users.findMany({
      where: eq(users.companyId, companyId),
      columns: {
        password: false, // Exclude password
      },
    })

    const usersWithRoles = await Promise.all(
      companyUsers.map(async (user) => {
        const userRolesData = await db
          .select({
            roleName: roles.name,
            roleDescription: roles.description,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id))

        return {
          ...user,
          roles: userRolesData.map((r) => r.roleName),
          status: "active", // Active users
        }
      }),
    )

    const pendingInvitations = await db
      .select({
        id: userInvitations.id,
        email: userInvitations.email,
        status: userInvitations.status,
        createdAt: userInvitations.createdAt,
        expiresAt: userInvitations.expiresAt,
        roleId: userInvitations.roleId,
      })
      .from(userInvitations)
      .where(eq(userInvitations.companyId, companyId))

    const invitationsWithRoles = await Promise.all(
      pendingInvitations.map(async (inv) => {
        const [roleData] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, inv.roleId)).limit(1)

        return {
          id: inv.id,
          email: inv.email,
          firstName: "Pending",
          lastName: "Invitation",
          isOwner: false,
          isActive: false,
          roles: roleData ? [roleData.name] : [],
          status: inv.status,
          createdAt: inv.createdAt.toISOString(),
          expiresAt: inv.expiresAt?.toISOString(),
        }
      }),
    )

    return NextResponse.json({ users: [...usersWithRoles, ...invitationsWithRoles] })
  } catch (error) {
    console.error("Get team members error:", error)
    return NextResponse.json({ error: "An error occurred while fetching team members" }, { status: 500 })
  }
}
