/**
 * Microsoft Outlook/Graph Calendar Integration
 * Handles OAuth 2.0 authentication and event management with Microsoft Graph API
 */

import { CalendarEvent, CalendarConfig, OAuthTokens, SyncResult } from './types'

// Microsoft OAuth endpoints
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const MICROSOFT_GRAPH_API = 'https://graph.microsoft.com/v1.0'

// Default scopes for Microsoft Calendar access
const MICROSOFT_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'Calendars.ReadWrite',
  'User.Read',
]

/**
 * Get Microsoft OAuth configuration from environment variables
 */
export function getMicrosoftConfig(): CalendarConfig {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback/microsoft`

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.')
  }

  return { clientId, clientSecret, redirectUri }
}

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getMicrosoftAuthUrl(state?: string): string {
  const config = getMicrosoftConfig()

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: MICROSOFT_SCOPES.join(' '),
    response_mode: 'query',
    ...(state && { state }),
  })

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeMicrosoftCode(code: string): Promise<OAuthTokens> {
  const config = getMicrosoftConfig()

  const response = await fetch(MICROSOFT_TOKEN_URL, {
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
    throw new Error(`Failed to exchange Microsoft code: ${error}`)
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
 * Refresh Microsoft access token
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<OAuthTokens> {
  const config = getMicrosoftConfig()

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: MICROSOFT_SCOPES.join(' '),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh Microsoft token: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Microsoft may return a new refresh token
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
    tokenType: data.token_type,
  }
}

/**
 * Get Microsoft user info (email)
 */
export async function getMicrosoftUserInfo(accessToken: string): Promise<{ email: string; name?: string }> {
  const response = await fetch(`${MICROSOFT_GRAPH_API}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get Microsoft user info')
  }

  const data = await response.json()
  return {
    email: data.mail || data.userPrincipalName,
    name: data.displayName,
  }
}

/**
 * Create a calendar event in Microsoft Outlook
 */
export async function createMicrosoftEvent(
  accessToken: string,
  event: CalendarEvent,
  calendarId?: string
): Promise<SyncResult> {
  try {
    const endpoint = calendarId
      ? `${MICROSOFT_GRAPH_API}/me/calendars/${calendarId}/events`
      : `${MICROSOFT_GRAPH_API}/me/events`

    const microsoftEvent = {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || '',
      },
      start: {
        dateTime: event.startTime.toISOString().slice(0, -1), // Remove Z suffix
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.endTime.toISOString().slice(0, -1),
        timeZone: event.timezone,
      },
      location: event.location ? {
        displayName: event.location,
      } : undefined,
      attendees: event.attendees?.map(a => ({
        emailAddress: {
          address: a.email,
          name: a.name,
        },
        type: 'required',
      })),
      isOnlineMeeting: !!event.meetingUrl,
      onlineMeetingUrl: event.meetingUrl,
      reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 15,
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(microsoftEvent),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Failed to create Microsoft event: ${error}` }
    }

    const data = await response.json()
    return { success: true, externalId: data.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating Microsoft event',
    }
  }
}

/**
 * Update a calendar event in Microsoft Outlook
 */
export async function updateMicrosoftEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>,
  calendarId?: string
): Promise<SyncResult> {
  try {
    const endpoint = calendarId
      ? `${MICROSOFT_GRAPH_API}/me/calendars/${calendarId}/events/${eventId}`
      : `${MICROSOFT_GRAPH_API}/me/events/${eventId}`

    const updateData: Record<string, unknown> = {}

    if (event.title) updateData.subject = event.title
    if (event.description !== undefined) {
      updateData.body = {
        contentType: 'HTML',
        content: event.description || '',
      }
    }
    if (event.location !== undefined) {
      updateData.location = event.location ? { displayName: event.location } : null
    }
    if (event.startTime) {
      updateData.start = {
        dateTime: event.startTime.toISOString().slice(0, -1),
        timeZone: event.timezone || 'Europe/Paris',
      }
    }
    if (event.endTime) {
      updateData.end = {
        dateTime: event.endTime.toISOString().slice(0, -1),
        timeZone: event.timezone || 'Europe/Paris',
      }
    }
    if (event.status === 'cancelled') {
      updateData.isCancelled = true
    }

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Failed to update Microsoft event: ${error}` }
    }

    const data = await response.json()
    return { success: true, externalId: data.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating Microsoft event',
    }
  }
}

/**
 * Delete a calendar event from Microsoft Outlook
 */
export async function deleteMicrosoftEvent(
  accessToken: string,
  eventId: string,
  calendarId?: string
): Promise<SyncResult> {
  try {
    const endpoint = calendarId
      ? `${MICROSOFT_GRAPH_API}/me/calendars/${calendarId}/events/${eventId}`
      : `${MICROSOFT_GRAPH_API}/me/events/${eventId}`

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok && response.status !== 204) {
      const error = await response.text()
      return { success: false, error: `Failed to delete Microsoft event: ${error}` }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error deleting Microsoft event',
    }
  }
}

/**
 * Get calendar events from Microsoft Outlook
 */
export async function getMicrosoftEvents(
  accessToken: string,
  options: {
    calendarId?: string
    startDateTime?: Date
    endDateTime?: Date
    top?: number
  } = {}
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    $top: String(options.top || 100),
    $orderby: 'start/dateTime',
  })

  if (options.startDateTime) {
    params.set('startDateTime', options.startDateTime.toISOString())
  }
  if (options.endDateTime) {
    params.set('endDateTime', options.endDateTime.toISOString())
  }

  const endpoint = options.calendarId
    ? `${MICROSOFT_GRAPH_API}/me/calendars/${options.calendarId}/calendarView?${params}`
    : `${MICROSOFT_GRAPH_API}/me/calendarView?${params}`

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Microsoft calendar events')
  }

  const data = await response.json()

  return (data.value || []).map((item: Record<string, unknown>) => ({
    externalId: item.id,
    title: item.subject || 'Untitled',
    description: (item.body as Record<string, string>)?.content,
    location: (item.location as Record<string, string>)?.displayName,
    startTime: new Date((item.start as Record<string, string>)?.dateTime + 'Z'),
    endTime: new Date((item.end as Record<string, string>)?.dateTime + 'Z'),
    timezone: (item.start as Record<string, string>)?.timeZone || 'UTC',
    status: item.isCancelled ? 'cancelled' : 'confirmed',
    meetingUrl: item.onlineMeetingUrl,
    attendees: (item.attendees as Array<Record<string, unknown>>)?.map(a => ({
      email: (a.emailAddress as Record<string, string>)?.address,
      name: (a.emailAddress as Record<string, string>)?.name,
      status: (a.status as Record<string, string>)?.response === 'accepted' ? 'accepted' :
              (a.status as Record<string, string>)?.response === 'declined' ? 'declined' :
              (a.status as Record<string, string>)?.response === 'tentativelyAccepted' ? 'tentative' : 'needsAction',
      isOrganizer: a.type === 'required',
    })),
  }))
}

/**
 * Get list of user's calendars
 */
export async function getMicrosoftCalendars(accessToken: string) {
  const response = await fetch(`${MICROSOFT_GRAPH_API}/me/calendars`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Microsoft calendars')
  }

  const data = await response.json()

  return (data.value || []).map((item: Record<string, unknown>) => ({
    id: item.id,
    name: item.name,
    color: item.hexColor,
    isDefault: item.isDefaultCalendar === true,
    canEdit: item.canEdit === true,
    owner: (item.owner as Record<string, string>)?.address,
  }))
}

/**
 * Create an online meeting with Microsoft Teams
 */
export async function createTeamsMeeting(
  accessToken: string,
  event: {
    subject: string
    startTime: Date
    endTime: Date
    timezone?: string
  }
): Promise<{ joinUrl: string; meetingId: string } | null> {
  try {
    const response = await fetch(`${MICROSOFT_GRAPH_API}/me/onlineMeetings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: event.subject,
        startDateTime: event.startTime.toISOString(),
        endDateTime: event.endTime.toISOString(),
      }),
    })

    if (!response.ok) {
      console.error('Failed to create Teams meeting:', await response.text())
      return null
    }

    const data = await response.json()
    return {
      joinUrl: data.joinWebUrl,
      meetingId: data.id,
    }
  } catch (error) {
    console.error('Error creating Teams meeting:', error)
    return null
  }
}
