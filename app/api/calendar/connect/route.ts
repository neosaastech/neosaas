import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/server'
import { getGoogleAuthUrl } from '@/lib/calendar/google'
import { getMicrosoftAuthUrl } from '@/lib/calendar/microsoft'
import { encrypt } from '@/lib/email/utils/encryption'

// GET /api/calendar/connect?provider=google|microsoft
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider || !['google', 'microsoft'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Use "google" or "microsoft".' },
        { status: 400 }
      )
    }

    // Create state parameter with user ID (encrypted for security)
    const stateData = JSON.stringify({
      userId: user.userId,
      timestamp: Date.now(),
    })
    const state = await encrypt(stateData)

    let authUrl: string

    try {
      if (provider === 'google') {
        authUrl = getGoogleAuthUrl(state)
      } else {
        authUrl = getMicrosoftAuthUrl(state)
      }
    } catch (configError) {
      console.error(`${provider} OAuth not configured:`, configError)
      return NextResponse.json(
        { error: `${provider} calendar integration is not configured` },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true, authUrl })
  } catch (error) {
    console.error('Failed to generate auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to initiate calendar connection' },
      { status: 500 }
    )
  }
}
