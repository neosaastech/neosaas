import { NextRequest, NextResponse } from 'next/server'
import { db, validateDatabaseUrl } from '@/db'
import { companies } from '@/db/schema'
import { getCurrentUser } from '@/lib/auth'
import { hasRole } from '@/lib/auth/server'
import { eq } from 'drizzle-orm'
import { processImageUpload } from '@/lib/images/process-upload'

type RouteParams = { params: Promise<{ companyId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    validateDatabaseUrl()
    const currentUser = await getCurrentUser()

    if (!currentUser?.userId || !(await hasRole(currentUser.userId, ['super_admin']))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { companyId } = await params
    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 })
    }

    const imagePath = await processImageUpload(file)

    const [updatedCompany] = await db
      .update(companies)
      .set({ logo: imagePath, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning()

    if (!updatedCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({
      company: updatedCompany,
      message: 'Company logo uploaded successfully',
      logo: imagePath,
    })
  } catch (error) {
    console.error('Admin upload company logo error:', error)
    const message = error instanceof Error ? error.message : 'An error occurred while uploading logo'
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

    const { companyId } = await params

    const [updatedCompany] = await db
      .update(companies)
      .set({ logo: null, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning()

    if (!updatedCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({
      company: updatedCompany,
      message: 'Company logo removed successfully',
    })
  } catch (error) {
    console.error('Admin delete company logo error:', error)
    return NextResponse.json({ error: 'An error occurred while deleting logo' }, { status: 500 })
  }
}
