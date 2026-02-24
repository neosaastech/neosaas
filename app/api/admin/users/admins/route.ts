import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, userRoles, roles } from '@/db/schema'
import { eq, or, inArray } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth/server'

// Force dynamic to prevent caching issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/users/admins - Get list of admin users
 * Returns users with admin or super_admin role
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin access
    await requireAdmin()

    // First, get the role IDs for 'admin' and 'super_admin' from the roles table
    const adminRoles = await db.query.roles.findMany({
      where: or(
        eq(roles.name, 'admin'),
        eq(roles.name, 'super_admin')
      ),
    })

    if (adminRoles.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const adminRoleIds = adminRoles.map(r => r.id)

    // Get all userRoles entries that match the admin role IDs
    const adminRoleEntries = await db.query.userRoles.findMany({
      where: inArray(userRoles.roleId, adminRoleIds),
    })

    const adminUserIds = [...new Set(adminRoleEntries.map(r => r.userId))]

    if (adminUserIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const adminUsers = await db.query.users.findMany({
      where: inArray(users.id, adminUserIds),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    return NextResponse.json({ success: true, data: adminUsers })
  } catch (error) {
    console.error('Failed to fetch admin users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin users' },
      { status: 500 }
    )
  }
}
