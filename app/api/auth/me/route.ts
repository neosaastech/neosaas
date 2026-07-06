import { NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { users, userRoles, roles, rolePermissions, permissions, companies } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    validateDatabaseUrl();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1);

    if (!userRecord) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let companySummary = null;
    if (userRecord.companyId) {
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, userRecord.companyId))
        .limit(1);

      if (company) {
        const { logo, ...rest } = company;
        companySummary = { ...rest, hasLogo: !!logo };
      }
    }

    const userRolesData = await db
      .select({
        roleName: roles.name,
        roleDescription: roles.description,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userRecord.id));

    const userPermissionsData = await db
      .select({
        permissionName: permissions.name,
        permissionDescription: permissions.description,
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userRecord.id));

    const uniquePermissions = userPermissionsData.reduce((acc, curr) => {
      if (!acc.find((p) => p.permissionName === curr.permissionName)) {
        acc.push(curr);
      }
      return acc;
    }, [] as typeof userPermissionsData);

    const { password: _, ...userWithoutPassword } = userRecord;

    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        company: companySummary,
        roles: userRolesData,
        permissions: uniquePermissions,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
}
