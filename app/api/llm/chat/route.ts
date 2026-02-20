import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { llmApiKeys, llmUsageLogs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyAuth } from '@/lib/auth/server'
import { z } from 'zod'
import crypto from 'crypto'

// Encryption helpers (same as in keys/route.ts)
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-in-production'
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
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

const chatSchema = z.object({
  provider: z.enum(['mistral', 'openai', 'anthropic', 'groq']),
  message: z.string().min(1, "Message is required"),
  model: z.string().optional(),
  conversationId: z.string().uuid().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
})

// Provider-specific configurations
const PROVIDER_CONFIGS = {
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-large-latest',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-sonnet-20240229',
    headerKey: 'x-api-key',
    headerPrefix: '',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.1-70b-versatile',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
  },
}

// POST /api/llm/chat - Send a message to an LLM provider
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let keyId: string | undefined

  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = chatSchema.parse(body)

    // Get the active key for this provider
    const key = await db.query.llmApiKeys.findFirst({
      where: and(
        eq(llmApiKeys.userId, user.userId),
        eq(llmApiKeys.provider, validated.provider),
        eq(llmApiKeys.isActive, true)
      ),
      orderBy: (keys, { desc }) => [desc(keys.isDefault), desc(keys.createdAt)],
    })

    if (!key) {
      return NextResponse.json(
        { error: `No active API key found for ${validated.provider}. Please add an API key in settings.` },
        { status: 400 }
      )
    }

    keyId = key.id

    // Decrypt the API key
    const apiKey = decrypt(key.encryptedKey)
    const config = PROVIDER_CONFIGS[validated.provider]
    const model = validated.model || config.defaultModel

    // Build the request based on provider
    let requestBody: any
    let headers: Record<string, string>

    if (validated.provider === 'anthropic') {
      // Anthropic has a different API format
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      }
      requestBody = {
        model,
        max_tokens: validated.maxTokens || 1024,
        messages: [
          { role: 'user', content: validated.message }
        ],
      }
      if (validated.systemPrompt) {
        requestBody.system = validated.systemPrompt
      }
      if (validated.temperature !== undefined) {
        requestBody.temperature = validated.temperature
      }
    } else {
      // OpenAI-compatible API (Mistral, OpenAI, Groq)
      headers = {
        'Content-Type': 'application/json',
        [config.headerKey]: `${config.headerPrefix}${apiKey}`,
      }
      const messages: any[] = []
      if (validated.systemPrompt) {
        messages.push({ role: 'system', content: validated.systemPrompt })
      }
      messages.push({ role: 'user', content: validated.message })

      requestBody = {
        model,
        messages,
      }
      if (validated.temperature !== undefined) {
        requestBody.temperature = validated.temperature
      }
      if (validated.maxTokens) {
        requestBody.max_tokens = validated.maxTokens
      }
    }

    // Make the API call
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    const latencyMs = Date.now() - startTime
    const responseData = await response.json()

    if (!response.ok) {
      // Log the error
      await db.insert(llmUsageLogs).values({
        keyId: key.id,
        userId: user.userId,
        provider: validated.provider,
        model,
        status: response.status === 429 ? 'rate_limited' : 'error',
        errorMessage: responseData.error?.message || JSON.stringify(responseData),
        latencyMs,
        conversationId: validated.conversationId || null,
      })

      return NextResponse.json(
        { error: responseData.error?.message || 'LLM API request failed' },
        { status: response.status }
      )
    }

    // Extract response and usage based on provider
    let content: string
    let promptTokens: number | undefined
    let completionTokens: number | undefined
    let totalTokens: number | undefined

    if (validated.provider === 'anthropic') {
      content = responseData.content?.[0]?.text || ''
      promptTokens = responseData.usage?.input_tokens
      completionTokens = responseData.usage?.output_tokens
      totalTokens = (promptTokens || 0) + (completionTokens || 0)
    } else {
      content = responseData.choices?.[0]?.message?.content || ''
      promptTokens = responseData.usage?.prompt_tokens
      completionTokens = responseData.usage?.completion_tokens
      totalTokens = responseData.usage?.total_tokens
    }

    // Log successful usage
    await db.insert(llmUsageLogs).values({
      keyId: key.id,
      userId: user.userId,
      provider: validated.provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      latencyMs,
      status: 'success',
      conversationId: validated.conversationId || null,
    })

    // Update key usage stats
    await db.update(llmApiKeys)
      .set({
        lastUsedAt: new Date(),
        usageCount: key.usageCount + 1,
      })
      .where(eq(llmApiKeys.id, key.id))

    return NextResponse.json({
      success: true,
      data: {
        response: content,
        model,
        provider: validated.provider,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        latencyMs,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    // Log the error if we have a key ID
    if (keyId) {
      const user = await verifyAuth()
      await db.insert(llmUsageLogs).values({
        keyId,
        userId: user?.userId || null,
        provider: 'unknown',
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      })
    }

    console.error('Failed to call LLM API:', error)
    return NextResponse.json(
      { error: 'Failed to process LLM request' },
      { status: 500 }
    )
  }
}
