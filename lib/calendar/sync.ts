/**
 * Calendar Sync Service
 * Coordinates synchronization between local appointments and external calendars
 */

import { db } from '@/db'
import { appointments, calendarConnections } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { encrypt, decrypt } from '@/lib/email/utils/encryption'
import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  refreshGoogleToken,
} from './google'
import {
  createMicrosoftEvent,
  updateMicrosoftEvent,
  deleteMicrosoftEvent,
  refreshMicrosoftToken,
} from './microsoft'
import type { CalendarEvent, CalendarProvider, SyncResult } from './types'

/**
 * Get valid access token for a calendar connection
 * Automatically refreshes if expired
 */
export async function getValidAccessToken(connectionId: string): Promise<string | null> {
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.id, connectionId),
  })

  if (!connection || !connection.isActive) {
    return null
  }

  // Check if token is expired or about to expire (5 minute buffer)
  const now = new Date()
  const expiresAt = connection.expiresAt
  const isExpired = expiresAt && expiresAt.getTime() - now.getTime() < 5 * 60 * 1000

  if (isExpired && connection.refreshToken) {
    try {
      const decryptedRefreshToken = await decrypt(connection.refreshToken)
      let newTokens

      if (connection.provider === 'google') {
        newTokens = await refreshGoogleToken(decryptedRefreshToken)
      } else {
        newTokens = await refreshMicrosoftToken(decryptedRefreshToken)
      }

      // Update stored tokens
      const encryptedAccessToken = await encrypt(newTokens.accessToken)
      const encryptedRefreshToken = newTokens.refreshToken
        ? await encrypt(newTokens.refreshToken)
        : connection.refreshToken

      await db.update(calendarConnections)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: newTokens.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, connectionId))

      return newTokens.accessToken
    } catch (error) {
      console.error('Failed to refresh calendar token:', error)
      // Mark connection as inactive if refresh fails
      await db.update(calendarConnections)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(calendarConnections.id, connectionId))
      return null
    }
  }

  // Return decrypted current access token
  try {
    return await decrypt(connection.accessToken)
  } catch {
    return null
  }
}

/**
 * Sync an appointment to connected calendars
 */
export async function syncAppointmentToCalendars(appointmentId: string): Promise<{
  google?: SyncResult
  microsoft?: SyncResult
}> {
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
  })

  if (!appointment) {
    return {
      google: { success: false, error: 'Appointment not found' },
      microsoft: { success: false, error: 'Appointment not found' },
    }
  }

  // Get user's calendar connections
  const connections = await db.query.calendarConnections.findMany({
    where: and(
      eq(calendarConnections.userId, appointment.userId),
      eq(calendarConnections.isActive, true)
    ),
  })

  const results: { google?: SyncResult; microsoft?: SyncResult } = {}

  const calendarEvent: CalendarEvent = {
    title: appointment.title,
    description: appointment.description || undefined,
    location: appointment.location || undefined,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    timezone: appointment.timezone,
    meetingUrl: appointment.meetingUrl || undefined,
    attendees: appointment.attendeeEmail
      ? [{ email: appointment.attendeeEmail, name: appointment.attendeeName || undefined }]
      : undefined,
    status: appointment.status === 'cancelled' ? 'cancelled' : 'confirmed',
  }

  for (const connection of connections) {
    const accessToken = await getValidAccessToken(connection.id)
    if (!accessToken) continue

    try {
      if (connection.provider === 'google') {
        if (appointment.googleEventId) {
          // Update existing event
          results.google = await updateGoogleEvent(
            accessToken,
            appointment.googleEventId,
            calendarEvent,
            connection.calendarId || 'primary'
          )
        } else {
          // Create new event
          results.google = await createGoogleEvent(
            accessToken,
            calendarEvent,
            connection.calendarId || 'primary'
          )

          // Store the external event ID
          if (results.google.success && results.google.externalId) {
            await db.update(appointments)
              .set({
                googleEventId: results.google.externalId,
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, appointmentId))
          }
        }
      } else if (connection.provider === 'microsoft') {
        if (appointment.microsoftEventId) {
          // Update existing event
          results.microsoft = await updateMicrosoftEvent(
            accessToken,
            appointment.microsoftEventId,
            calendarEvent,
            connection.calendarId || undefined
          )
        } else {
          // Create new event
          results.microsoft = await createMicrosoftEvent(
            accessToken,
            calendarEvent,
            connection.calendarId || undefined
          )

          // Store the external event ID
          if (results.microsoft.success && results.microsoft.externalId) {
            await db.update(appointments)
              .set({
                microsoftEventId: results.microsoft.externalId,
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, appointmentId))
          }
        }
      }

      // Update last sync time
      await db.update(calendarConnections)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(calendarConnections.id, connection.id))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (connection.provider === 'google') {
        results.google = { success: false, error: errorMessage }
      } else {
        results.microsoft = { success: false, error: errorMessage }
      }
    }
  }

  return results
}

/**
 * Delete appointment from connected calendars
 */
export async function deleteAppointmentFromCalendars(appointmentId: string): Promise<{
  google?: SyncResult
  microsoft?: SyncResult
}> {
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
  })

  if (!appointment) {
    return {
      google: { success: false, error: 'Appointment not found' },
      microsoft: { success: false, error: 'Appointment not found' },
    }
  }

  const connections = await db.query.calendarConnections.findMany({
    where: and(
      eq(calendarConnections.userId, appointment.userId),
      eq(calendarConnections.isActive, true)
    ),
  })

  const results: { google?: SyncResult; microsoft?: SyncResult } = {}

  for (const connection of connections) {
    const accessToken = await getValidAccessToken(connection.id)
    if (!accessToken) continue

    try {
      if (connection.provider === 'google' && appointment.googleEventId) {
        results.google = await deleteGoogleEvent(
          accessToken,
          appointment.googleEventId,
          connection.calendarId || 'primary'
        )
      } else if (connection.provider === 'microsoft' && appointment.microsoftEventId) {
        results.microsoft = await deleteMicrosoftEvent(
          accessToken,
          appointment.microsoftEventId,
          connection.calendarId || undefined
        )
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (connection.provider === 'google') {
        results.google = { success: false, error: errorMessage }
      } else {
        results.microsoft = { success: false, error: errorMessage }
      }
    }
  }

  return results
}

/**
 * Store calendar connection after OAuth callback
 */
export async function storeCalendarConnection(
  userId: string,
  provider: CalendarProvider,
  tokens: {
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
  },
  email?: string,
  calendarId?: string
): Promise<{ success: boolean; connectionId?: string; error?: string }> {
  try {
    // Encrypt tokens before storing
    const encryptedAccessToken = await encrypt(tokens.accessToken)
    const encryptedRefreshToken = tokens.refreshToken
      ? await encrypt(tokens.refreshToken)
      : null

    // Check if connection already exists for this provider
    const existing = await db.query.calendarConnections.findFirst({
      where: and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.provider, provider)
      ),
    })

    if (existing) {
      // Update existing connection
      await db.update(calendarConnections)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiresAt || null,
          email: email || existing.email,
          calendarId: calendarId || existing.calendarId,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, existing.id))

      return { success: true, connectionId: existing.id }
    }

    // Create new connection
    const [result] = await db.insert(calendarConnections)
      .values({
        userId,
        provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiresAt || null,
        email: email || null,
        calendarId: calendarId || null,
        isActive: true,
      })
      .returning({ id: calendarConnections.id })

    return { success: true, connectionId: result.id }
  } catch (error) {
    console.error('Failed to store calendar connection:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store connection',
    }
  }
}

/**
 * Disconnect a calendar integration
 */
export async function disconnectCalendar(
  userId: string,
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(calendarConnections)
      .where(and(
        eq(calendarConnections.id, connectionId),
        eq(calendarConnections.userId, userId)
      ))

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect calendar',
    }
  }
}
