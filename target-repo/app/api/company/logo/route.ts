import { NextRequest, NextResponse } from 'next/server'
import { db, validateDatabaseUrl } from '@/db'
import { companies, userRoles, roles, users } from '@/db/schema'
import { getCurrentUser } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { processImageUpload } from '@/lib/images/process-upload'

async function userCanManageCompany(userId: string, companyId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user || user.companyId !== companyId) {
    return false
  }

  const userRolesData = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId))

  const roleNames = userRolesData.map((r) => r.roleName)
  return roleNames.some((role) => ['writer', 'admin', 'super_admin'].includes(role))
}

export async function GET() {
  try {
    validateDatabaseUrl()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId),
      with: { company: true },
    })

    if (!user?.companyId || !user.company) {
      return NextResponse.json({ logo: null })
    }

    return NextResponse.json({ logo: user.company.logo ?? null })
  } catch (error) {
    console.error('Get company logo error:', error)
    return NextResponse.json({ error: 'An error occurred while fetching logo' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    validateDatabaseUrl()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId),
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: 'No company linked to this account' }, { status: 400 })
    }

    const canManage = await userCanManageCompany(user.id, user.companyId)
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 })
    }

    const imagePath = await processImageUpload(file)

    const [updatedCompany] = await db
      .update(companies)
      .set({ logo: imagePath, updatedAt: new Date() })
      .where(eq(companies.id, user.companyId))
      .returning()

    return NextResponse.json({
      company: updatedCompany,
      message: 'Company logo uploaded successfully',
      logo: imagePath,
    })
  } catch (error) {
    console.error('Upload company logo error:', error)
    const message = error instanceof Error ? error.message : 'An error occurred while uploading logo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    validateDatabaseUrl()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId),
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: 'No company linked to this account' }, { status: 400 })
    }

    const canManage = await userCanManageCompany(user.id, user.companyId)
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const [updatedCompany] = await db
      .update(companies)
      .set({ logo: null, updatedAt: new Date() })
      .where(eq(companies.id, user.companyId))
      .returning()

    return NextResponse.json({
      company: updatedCompany,
      message: 'Company logo removed successfully',
    })
  } catch (error) {
    console.error('Delete company logo error:', error)
    return NextResponse.json({ error: 'An error occurred while deleting logo' }, { status: 500 })
  }
}
