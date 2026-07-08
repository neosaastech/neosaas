import { NextRequest, NextResponse } from 'next/server'
import { db, validateDatabaseUrl } from '@/db'
import { users } from '@/db/schema'
import { getCurrentUser } from '@/lib/auth'
import { hasRole } from '@/lib/auth/server'
import { eq } from 'drizzle-orm'
import { processImageUpload } from '@/lib/images/process-upload'

type RouteParams = { params: Promise<{ userId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    validateDatabaseUrl()
    const currentUser = await getCurrentUser()

    if (!currentUser?.userId || !(await hasRole(currentUser.userId, ['super_admin']))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await params
    const formData = await request.formData()
    const file = formData.get('profileImage') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No profile image file provided' }, { status: 400 })
    }

    const imagePath = await processImageUpload(file)

    const [updatedUser] = await db
      .update(users)
      .set({ profileImage: imagePath, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Profile image uploaded successfully',
      profileImage: imagePath,
    })
  } catch (error) {
    console.error('Admin upload user profile image error:', error)
    const message = error instanceof Error ? error.message : 'An error occurred while uploading profile image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    validateDatabaseUrl()
    const currentUser = await getCurrentUser()

    if (!currentUser?.userId || !(await hasRole(currentUser.userId, ['super_admin']))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await params

    const [updatedUser] = await db
      .update(users)
      .set({ profileImage: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Profile image removed successfully' })
  } catch (error) {
    console.error('Admin delete user profile image error:', error)
    return NextResponse.json({ error: 'An error occurred while deleting profile image' }, { status: 500 })
  }
}
