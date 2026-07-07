import { NextRequest, NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { users, userRoles, rolePermissions, permissions } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

/**
 * PATCH /api/users/[id]/status
 * Activate or deactivate a user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    validateDatabaseUrl();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if user has 'manage_users' permission
    const hasManagePermission = await db
      .select({ permissionName: permissions.name })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, currentUser.userId),
          eq(permissions.name, 'manage_users')
        )
      )
      .limit(1);

    if (hasManagePermission.length === 0) {
      return NextResponse.json(
        { error: 'You do not have permission to manage users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Get the target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user is in the same company
    if (targetUser.companyId !== currentUser.companyId) {
      return NextResponse.json(
        { error: 'You can only manage users in your own company' },
        { status: 403 }
      );
    }

    // Note: Company owner protection removed as isOwner field doesn't exist
    // Super admins can manage all users through the admin panel

    // Prevent users from deactivating themselves
    if (targetUser.id === currentUser.userId) {
      return NextResponse.json(
        { error: 'You cannot deactivate yourself' },
        { status: 400 }
      );
    }

    // Update user status
    const [updatedUser] = await db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({
      user: userWithoutPassword,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating user status' },
      { status: 500 }
    );
  }
}
