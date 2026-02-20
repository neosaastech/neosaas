/**
 * Google Calendar Integration
 * Handles OAuth 2.0 authentication and event management with Google Calendar API
 */

import { CalendarEvent, CalendarConfig, OAuthTokens, SyncResult } from './types'

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

// Default scopes for Google Calendar access
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

/**
 * Get Google OAuth configuration from environment variables
 */
export function getGoogleConfig(): CalendarConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback/google`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')
  }

  return { clientId, clientSecret, redirectUri }
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state?: string): string {
  const config = getGoogleConfig()

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleCode(code: string): Promise<OAuthTokens> {
  const config = getGoogleConfig()

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange Google code: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
    tokenType: data.token_type,
  }
}

/**
 * Refresh Google access token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<OAuthTokens> {
  const config = getGoogleConfig()

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh Google token: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Keep the original refresh token
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
    tokenType: data.token_type,
  }
}

/**
 * Get Google user info (email)
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{ email: string; name?: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get Google user info')
  }

  const data = await response.json()
  return { email: data.email, name: data.name }
}

/**
 * Revoke Google OAuth token
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
}

/**
 * Create a calendar event in Google Calendar
 */
export async function createGoogleEvent(
  accessToken: string,
  event: CalendarEvent,
  calendarId: string = 'primary'
): Promise<SyncResult> {
  try {
    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timezone,
      },
      attendees: event.attendees?.map(a => ({
        email: a.email,
        displayName: a.name,
      })),
      conferenceData: event.meetingUrl ? {
        entryPoints: [{
          entryPointType: 'video',
          uri: event.meetingUrl,
        }],
      } : undefined,
      reminders: event.reminders ? {
        useDefault: false,
        overrides: event.reminders.map(r => ({
          method: r.method === 'popup' ? 'popup' : 'email',
          minutes: r.minutes,
        })),
      } : { useDefault: true },
    }

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Failed to create Google event: ${error}` }
    }

    const data = await response.json()
    return { success: true, externalId: data.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating Google event',
    }
  }
}

/**
 * Update a calendar event in Google Calendar
 */
export async function updateGoogleEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>,
  calendarId: string = 'primary'
): Promise<SyncResult> {
  try {
    const updateData: Record<string, unknown> = {}

    if (event.title) updateData.summary = event.title
    if (event.description !== undefined) updateData.description = event.description
    if (event.location !== undefined) updateData.location = event.location
    if (event.startTime) {
      updateData.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timezone || 'Europe/Paris',
      }
    }
    if (event.endTime) {
      updateData.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timezone || 'Europe/Paris',
      }
    }
    if (event.status) {
      updateData.status = event.status
    }

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Failed to update Google event: ${error}` }
    }

    const data = await response.json()
    return { success: true, externalId: data.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating Google event',
    }
  }
}

/**
 * Delete a calendar event from Google Calendar
 */
export async function deleteGoogleEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<SyncResult> {
  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok && response.status !== 204) {
      const error = await response.text()
      return { success: false, error: `Failed to delete Google event: ${error}` }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error deleting Google event',
    }
  }
}

/**
 * Get calendar events from Google Calendar
 */
export async function getGoogleEvents(
  accessToken: string,
  options: {
    calendarId?: string
    timeMin?: Date
    timeMax?: Date
    maxResults?: number
  } = {}
): Promise<CalendarEvent[]> {
  const calendarId = options.calendarId || 'primary'
  const params = new URLSearchParams({
    maxResults: String(options.maxResults || 100),
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  if (options.timeMin) {
    params.set('timeMin', options.timeMin.toISOString())
  }
  if (options.timeMax) {
    params.set('timeMax', options.timeMax.toISOString())
  }

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch Google calendar events')
  }

  const data = await response.json()

  return (data.items || []).map((item: Record<string, unknown>) => ({
    externalId: item.id,
    title: item.summary || 'Untitled',
    description: item.description,
    location: item.location,
    startTime: new Date((item.start as Record<string, string>)?.dateTime || (item.start as Record<string, string>)?.date),
    endTime: new Date((item.end as Record<string, string>)?.dateTime || (item.end as Record<string, string>)?.date),
    timezone: (item.start as Record<string, string>)?.timeZone || 'UTC',
    status: item.status === 'cancelled' ? 'cancelled' : 'confirmed',
    meetingUrl: (item.conferenceData as Record<string, unknown>)?.entryPoints?.[0]?.uri,
    attendees: (item.attendees as Array<Record<string, string>>)?.map(a => ({
      email: a.email,
      name: a.displayName,
      status: a.responseStatus === 'accepted' ? 'accepted' :
              a.responseStatus === 'declined' ? 'declined' :
              a.responseStatus === 'tentative' ? 'tentative' : 'needsAction',
      isOrganizer: a.organizer === true,
    })),
  }))
}

/**
 * Get list of user's calendars
 */
export async function getGoogleCalendars(accessToken: string) {
  const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Google calendars')
  }

  const data = await response.json()

  return (data.items || []).map((item: Record<string, unknown>) => ({
    id: item.id,
    name: item.summary,
    description: item.description,
    isPrimary: item.primary === true,
    accessRole: item.accessRole,
    backgroundColor: item.backgroundColor,
  }))
}
