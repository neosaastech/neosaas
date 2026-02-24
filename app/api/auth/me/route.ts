import { NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { users, userRoles, roles, rolePermissions, permissions } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    validateDatabaseUrl();
    // Get current user from JWT token
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch full user data from database with company
    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId),
      with: {
        company: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user roles
    const userRolesData = await db
      .select({
        roleName: roles.name,
        roleDescription: roles.description,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    // Get user permissions (via roles)
    const userPermissionsData = await db
      .select({
        permissionName: permissions.name,
        permissionDescription: permissions.description,
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, user.id));

    // Remove duplicates from permissions
    const uniquePermissions = userPermissionsData.reduce((acc, curr) => {
      if (!acc.find(p => p.permissionName === curr.permissionName)) {
        acc.push(curr);
      }
      return acc;
    }, [] as typeof userPermissionsData);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        roles: userRolesData,
        permissions: uniquePermissions,
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
}
