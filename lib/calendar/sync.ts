/**
 * Calendar Sync Service
 * Handles OAuth token management and calendar connections
 */

import { db } from '@/db'
import { calendarConnections } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { encrypt, decrypt } from '@/lib/email/utils/encryption'
import { refreshGoogleToken } from './google'
import { refreshMicrosoftToken } from './microsoft'
import type { CalendarProvider } from './types'

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
