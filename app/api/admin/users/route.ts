import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, companies } from '@/db/schema'
import { eq, or, ilike, and, desc } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth/server'

// GET /api/admin/users - Search and list users (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        profileImage: users.profileImage,
        companyId: users.companyId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)

    // Add search filter if provided
    if (search && search.length >= 2) {
      const searchPattern = `%${search}%`
      query = query.where(
        or(
          ilike(users.firstName, searchPattern),
          ilike(users.lastName, searchPattern),
          ilike(users.email, searchPattern)
        )
      ) as typeof query
    }

    const usersList = await query

    // Fetch company info for users with companyId
    const usersWithCompany = await Promise.all(
      usersList.map(async (user) => {
        let company = null
        if (user.companyId) {
          const [companyData] = await db
            .select({ name: companies.name })
            .from(companies)
            .where(eq(companies.id, user.companyId))
            .limit(1)
          company = companyData || null
        }
        return {
          ...user,
          company,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: usersWithCompany,
    })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
