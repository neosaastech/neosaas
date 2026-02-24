import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatQuickResponses } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAdmin, verifyAuth } from '@/lib/auth/server'
import { z } from 'zod'

const quickResponseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().optional(),
  shortcut: z.string().optional(),
})

// GET /api/admin/chat/quick-responses - List quick responses
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const conditions: any[] = [eq(chatQuickResponses.isActive, true)]
    if (category) {
      conditions.push(eq(chatQuickResponses.category, category))
    }

    const responses = await db.query.chatQuickResponses.findMany({
      where: conditions.length > 1 ? eq(chatQuickResponses.isActive, true) : undefined,
      orderBy: [desc(chatQuickResponses.usageCount), desc(chatQuickResponses.createdAt)],
    })

    return NextResponse.json({ success: true, data: responses })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to fetch quick responses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quick responses' },
      { status: 500 }
    )
  }
}

// POST /api/admin/chat/quick-responses - Create quick response
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const user = await verifyAuth()
    const body = await request.json()
    const validated = quickResponseSchema.parse(body)

    const [response] = await db.insert(chatQuickResponses).values({
      title: validated.title,
      content: validated.content,
      category: validated.category || null,
      shortcut: validated.shortcut || null,
      createdBy: user?.userId || null,
      usageCount: 0,
      isActive: true,
    }).returning()

    return NextResponse.json({ success: true, data: response }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Failed to create quick response:', error)
    return NextResponse.json(
      { error: 'Failed to create quick response' },
      { status: 500 }
    )
  }
}
