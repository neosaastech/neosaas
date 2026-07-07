import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { llmApiKeys } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyAuth } from '@/lib/auth/server'
import { z } from 'zod'

const updateKeySchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})

// GET /api/llm/keys/[id] - Get a specific key
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const key = await db.query.llmApiKeys.findFirst({
      where: and(
        eq(llmApiKeys.id, id),
        eq(llmApiKeys.userId, user.userId)
      ),
      columns: {
        id: true,
        provider: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        isDefault: true,
        lastUsedAt: true,
        usageCount: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: key })
  } catch (error) {
    console.error('Failed to fetch LLM key:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 }
    )
  }
}

// PATCH /api/llm/keys/[id] - Update a key
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingKey = await db.query.llmApiKeys.findFirst({
      where: and(
        eq(llmApiKeys.id, id),
        eq(llmApiKeys.userId, user.userId)
      ),
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateKeySchema.parse(body)

    // If setting as default, unset other defaults for this provider
    if (validated.isDefault) {
      await db.update(llmApiKeys)
        .set({ isDefault: false })
        .where(
          and(
            eq(llmApiKeys.userId, user.userId),
            eq(llmApiKeys.provider, existingKey.provider)
          )
        )
    }

    const [updated] = await db.update(llmApiKeys)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(llmApiKeys.id, id))
      .returning({
        id: llmApiKeys.id,
        provider: llmApiKeys.provider,
        name: llmApiKeys.name,
        keyPrefix: llmApiKeys.keyPrefix,
        isActive: llmApiKeys.isActive,
        isDefault: llmApiKeys.isDefault,
        updatedAt: llmApiKeys.updatedAt,
      })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Failed to update LLM key:', error)
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    )
  }
}

// DELETE /api/llm/keys/[id] - Delete a key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingKey = await db.query.llmApiKeys.findFirst({
      where: and(
        eq(llmApiKeys.id, id),
        eq(llmApiKeys.userId, user.userId)
      ),
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    await db.delete(llmApiKeys).where(eq(llmApiKeys.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete LLM key:', error)
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
