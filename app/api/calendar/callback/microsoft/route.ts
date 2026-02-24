import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/email/utils/encryption'
import { exchangeMicrosoftCode, getMicrosoftUserInfo } from '@/lib/calendar/microsoft'
import { storeCalendarConnection } from '@/lib/calendar/sync'

// GET /api/calendar/callback/microsoft - Microsoft OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Build redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectBase = `${baseUrl}/dashboard/calendar/settings`

    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription)
      return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${redirectBase}?error=missing_params`)
    }

    // Decrypt and validate state
    let stateData: { userId: string; timestamp: number }
    try {
      const decryptedState = await decrypt(state)
      stateData = JSON.parse(decryptedState)

      // Check if state is too old (15 minutes)
      if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
        return NextResponse.redirect(`${redirectBase}?error=state_expired`)
      }
    } catch {
      return NextResponse.redirect(`${redirectBase}?error=invalid_state`)
    }

    // Exchange code for tokens
    const tokens = await exchangeMicrosoftCode(code)

    // Get user info
    const userInfo = await getMicrosoftUserInfo(tokens.accessToken)

    // Store connection
    const result = await storeCalendarConnection(
      stateData.userId,
      'microsoft',
      tokens,
      userInfo.email
    )

    if (!result.success) {
      return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(result.error || 'storage_failed')}`)
    }

    return NextResponse.redirect(`${redirectBase}?success=microsoft`)
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}/dashboard/calendar/settings?error=callback_failed`)
  }
}
