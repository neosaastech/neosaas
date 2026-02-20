import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/server"
import { db } from "@/db"
import { users, companies, orders, chatConversations } from "@/db/schema"
import { eq, count, sum, desc } from "drizzle-orm"

// GET /api/admin/users/[userId] - Get a single user by ID (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin access
    await requireAdmin()

    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Fetch user with company info
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        company: true,
        userRoles: {
          with: {
            role: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Fetch order stats
    const orderStats = await db
      .select({
        totalOrders: count(orders.id),
        totalSpent: sum(orders.totalAmount)
      })
      .from(orders)
      .where(eq(orders.userId, userId))

    // Fetch ticket/conversation count
    const ticketStats = await db
      .select({
        ticketsCreated: count(chatConversations.id)
      })
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))

    // Get recent orders for the activity section
    const recentOrders = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      orderBy: [desc(orders.createdAt)],
      limit: 5
    })

    // Format response
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      profileType: user.userRoles?.[0]?.role?.name || 'user',
      address: user.address,
      city: user.city,
      postalCode: user.postalCode,
      country: user.country,
      position: user.position,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      company: user.company ? {
        id: user.company.id,
        name: user.company.name,
        email: user.company.email,
        phone: user.company.phone,
        siret: user.company.siret,
        vatNumber: user.company.vatNumber,
        address: user.company.address,
        city: user.company.city,
        zipCode: user.company.zipCode
      } : null,
      stats: {
        totalOrders: Number(orderStats[0]?.totalOrders || 0),
        totalSpent: Number(orderStats[0]?.totalSpent || 0),
        ticketsCreated: Number(ticketStats[0]?.ticketsCreated || 0)
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt
      }))
    }

    return NextResponse.json({
      success: true,
      data: userData
    })

  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/users/[userId] - Update a user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireAdmin()

    const { userId } = params
    const body = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Only allow updating specific fields
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'address', 'city',
      'postalCode', 'country', 'position', 'isActive', 'companyId'
    ]

    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date()

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning()

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedUser
    })

  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}
