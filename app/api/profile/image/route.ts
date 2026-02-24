import { NextRequest, NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

/**
 * POST /api/profile/image
 * Upload user profile image
 */
export async function POST(request: NextRequest) {
  try {
    validateDatabaseUrl();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB for Base64 storage)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 2MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer then to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Create an SVG container that crops the image to a square (512x512)
    // This ensures the profile picture is always square without needing heavy image processing libraries
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image href="${base64Image}" width="512" height="512" preserveAspectRatio="xMidYMid slice" />
</svg>`.trim();

    const svgBuffer = Buffer.from(svgContent);
    const imagePath = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;

    // Update user with new image path (SVG Base64)
    const [updatedUser] = await db
      .update(users)
      .set({
        profileImage: imagePath,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.userId))
      .returning();

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Profile image uploaded successfully',
      imagePath,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return NextResponse.json(
      { error: 'An error occurred while uploading image' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/image
 * Delete user profile image
 */
export async function DELETE() {
  try {
    validateDatabaseUrl();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get current user
    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId),
    });

    if (!user?.profileImage) {
      return NextResponse.json(
        { error: 'No profile image to delete' },
        { status: 400 }
      );
    }

    // Update user to remove image path
    const [updatedUser] = await db
      .update(users)
      .set({
        profileImage: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.userId))
      .returning();

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Profile image deleted successfully',
    });
  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting image' },
      { status: 500 }
    );
  }
}
