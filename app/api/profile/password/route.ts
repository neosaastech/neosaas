import { NextRequest, NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { users } from '@/db/schema';
import { getCurrentUser, verifyPassword, hashPassword } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { notifyAdminClientAction } from '@/lib/notifications/admin-notifications';

/**
 * PUT /api/profile/password
 * Change current user's password
 */
export async function PUT(request: NextRequest) {
  try {
    validateDatabaseUrl();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.userId));

    // Track password change action for admin
    try {
      await notifyAdminClientAction({
        userId: currentUser.userId,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        actionType: 'settings',
        actionTitle: 'Password Changed',
        actionDescription: 'User changed their account password',
        priority: 'normal',
      });
    } catch (notifyError) {
      console.error('[Password] Failed to send admin notification:', notifyError);
      // Don't fail the request
    }

    return NextResponse.json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating password' },
      { status: 500 }
    );
  }
}
