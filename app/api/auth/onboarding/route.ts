
import { NextRequest, NextResponse } from "next/server"
import { db, validateDatabaseUrl } from "@/db"
import { users, companies, userRoles, roles } from "@/db/schema"
import { getCurrentUser, createToken, setAuthCookie } from "@/lib/auth"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    validateDatabaseUrl()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, companyName, companyEmail } = body

    if (!firstName || !lastName || !companyName || !companyEmail) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // 1. Create Company
    const [newCompany] = await db.insert(companies).values({
      name: companyName,
      email: companyEmail,
    }).returning()

    // 2. Update User
    const [updatedUser] = await db.update(users)
      .set({
        firstName,
        lastName,
        companyId: newCompany.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.userId))
      .returning()

    // 3. Assign 'writer' role (Company Admin)
    const writerRole = await db.query.roles.findFirst({
      where: eq(roles.name, "writer"),
    })

    if (writerRole) {
      // Check if user already has this role (unlikely for new company, but good practice)
      const existingRole = await db.query.userRoles.findFirst({
        where: (userRoles, { and, eq }) => and(
          eq(userRoles.userId, currentUser.userId),
          eq(userRoles.roleId, writerRole.id)
        ),
      })

      if (!existingRole) {
        await db.insert(userRoles).values({
          userId: currentUser.userId,
          roleId: writerRole.id,
        })
      }
    }

    // 4. Refresh Token (to include new companyId and roles)
    // We need to fetch all roles again to be sure
    const userRolesData = await db.query.userRoles.findMany({
        where: eq(userRoles.userId, currentUser.userId),
        with: { role: true }
    })
    
    const roleNames = userRolesData.map(ur => ur.role.name)
    // Note: We should also fetch permissions if needed, but for now roles are enough for the token payload structure I recall

    const newToken = createToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      companyId: newCompany.id,
      roles: roleNames,
    })

    await setAuthCookie(newToken)

    return NextResponse.json({
      success: true,
      company: newCompany,
      user: updatedUser,
    })

  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 })
  }
}
