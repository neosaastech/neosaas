import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { llmApiKeys } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { verifyAuth, isAdmin } from '@/lib/auth/server'
import { z } from 'zod'
import crypto from 'crypto'

// Encryption helpers
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-in-production'
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

function decrypt(encryptedData: string): string {
  const [ivHex, tagHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function getKeyPrefix(apiKey: string): string {
  if (apiKey.length > 8) {
    return `${apiKey.substring(0, 7)}...`
  }
  return '***'
}

const createKeySchema = z.object({
  provider: z.enum(['mistral', 'openai', 'anthropic', 'groq']),
  name: z.string().min(1, "Name is required"),
  apiKey: z.string().min(10, "API key is required"),
  isDefault: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})

// GET /api/llm/keys - List user's LLM API keys
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    const conditions = [eq(llmApiKeys.userId, user.userId)]
    if (provider) {
      conditions.push(eq(llmApiKeys.provider, provider))
    }

    const keys = await db.query.llmApiKeys.findMany({
      where: and(...conditions),
      orderBy: [desc(llmApiKeys.createdAt)],
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

    return NextResponse.json({ success: true, data: keys })
  } catch (error) {
    console.error('Failed to fetch LLM keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    )
  }
}

// POST /api/llm/keys - Add a new LLM API key
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createKeySchema.parse(body)

    // If setting as default, unset other defaults for this provider
    if (validated.isDefault) {
      await db.update(llmApiKeys)
        .set({ isDefault: false })
        .where(
          and(
            eq(llmApiKeys.userId, user.userId),
            eq(llmApiKeys.provider, validated.provider)
          )
        )
    }

    // Encrypt the API key
    const encryptedKey = encrypt(validated.apiKey)
    const keyPrefix = getKeyPrefix(validated.apiKey)

    const [newKey] = await db.insert(llmApiKeys).values({
      userId: user.userId,
      provider: validated.provider,
      name: validated.name,
      encryptedKey,
      keyPrefix,
      isActive: true,
      isDefault: validated.isDefault || false,
      metadata: validated.metadata || null,
    }).returning({
      id: llmApiKeys.id,
      provider: llmApiKeys.provider,
      name: llmApiKeys.name,
      keyPrefix: llmApiKeys.keyPrefix,
      isActive: llmApiKeys.isActive,
      isDefault: llmApiKeys.isDefault,
      createdAt: llmApiKeys.createdAt,
    })

    return NextResponse.json({ success: true, data: newKey }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Failed to create LLM key:', error)
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}
