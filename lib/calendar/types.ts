/**
 * Calendar Types - Shared types for calendar integrations
 */

export type CalendarProvider = 'google' | 'microsoft'

export interface CalendarEvent {
  id?: string
  externalId?: string // Google or Microsoft event ID
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  timezone: string
  attendees?: CalendarAttendee[]
  meetingUrl?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  isAllDay?: boolean
  reminders?: CalendarReminder[]
  metadata?: Record<string, unknown>
}

export interface CalendarAttendee {
  email: string
  name?: string
  status?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
  isOrganizer?: boolean
}

export interface CalendarReminder {
  method: 'email' | 'popup' | 'sms'
  minutes: number
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string
  tokenType?: string
}

export interface CalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface SyncResult {
  success: boolean
  eventId?: string
  externalId?: string
  error?: string
}

export interface CalendarConnection {
  id: string
  provider: CalendarProvider
  email?: string
  isActive: boolean
  lastSyncAt?: Date
}
