import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, userRoles, roles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      // Return all users with roles
      const allUsers = await db.query.users.findMany({
        with: {
          userRoles: {
            with: {
              role: true
            }
          },
          company: true
        },
        orderBy: (users, { desc }) => [desc(users.createdAt)]
      })

      return NextResponse.json({
        users: allUsers.map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          companyName: u.company?.name,
          isActive: u.isActive,
          roles: u.userRoles.map(ur => ({
            name: ur.role.name,
            scope: ur.role.scope
          }))
        }))
      })
    }

    // Check specific user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        userRoles: {
          with: {
            role: true
          }
        },
        company: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.company?.name,
      companyId: user.companyId,
      isActive: user.isActive,
      roles: user.userRoles.map(ur => ({
        id: ur.roleId,
        name: ur.role.name,
        scope: ur.role.scope,
        description: ur.role.description
      })),
      hasAdminRole: user.userRoles.some(ur =>
        ur.role.name === 'admin' || ur.role.name === 'super_admin'
      )
    })
  } catch (error) {
    console.error('Error checking roles:', error)
    return NextResponse.json(
      { error: 'An error occurred while checking roles' },
      { status: 500 }
    )
  }
}
