import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { calendarConnections } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyAuth } from '@/lib/auth/server'

// GET /api/calendar - Get user's calendar connections
export async function GET() {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connections = await db.query.calendarConnections.findMany({
      where: eq(calendarConnections.userId, user.userId),
      columns: {
        id: true,
        provider: true,
        email: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        // Exclude tokens for security
      },
    })

    return NextResponse.json({ success: true, data: connections })
  } catch (error) {
    console.error('Failed to fetch calendar connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar connections' },
      { status: 500 }
    )
  }
}

// DELETE /api/calendar - Delete a calendar connection
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('id')

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 })
    }

    await db.delete(calendarConnections)
      .where(and(
        eq(calendarConnections.id, connectionId),
        eq(calendarConnections.userId, user.userId)
      ))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete calendar connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete calendar connection' },
      { status: 500 }
    )
  }
}
