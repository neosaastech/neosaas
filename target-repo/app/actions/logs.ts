'use server'

import { db } from "@/db"
import { systemLogs, emailHistory, type NewSystemLog } from "@/db/schema"
import { desc, eq, lt, and, like, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type LogFilter = {
  category?: string
  level?: string
  search?: string
  startDate?: Date
  endDate?: Date
}

export async function getSystemLogs(filters: LogFilter = {}) {
  try {
    const conditions = []

    if (filters.category && filters.category !== "all") {
      conditions.push(eq(systemLogs.category, filters.category))
    }

    if (filters.level && filters.level !== "all") {
      conditions.push(eq(systemLogs.level, filters.level))
    }

    if (filters.search) {
      conditions.push(like(systemLogs.message, `%${filters.search}%`))
    }

    if (filters.startDate) {
      conditions.push(sql`${systemLogs.createdAt} >= ${filters.startDate.toISOString()}`)
    }

    if (filters.endDate) {
      conditions.push(sql`${systemLogs.createdAt} <= ${filters.endDate.toISOString()}`)
    }

    const logs = await db.query.systemLogs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(systemLogs.createdAt)],
      limit: 1000,
      with: {
        user: true
      }
    })

    return { success: true, data: logs }
  } catch (error) {
    console.error("Failed to fetch system logs:", error)
    return { success: false, error: "Failed to fetch system logs" }
  }
}

export async function logSystemEvent(data: NewSystemLog) {
  try {
    await db.insert(systemLogs).values(data)
    return { success: true }
  } catch (error) {
    console.error("Failed to create system log:", error)
    return { success: false, error: "Failed to create system log" }
  }
}

export async function deleteSystemLogs(filters: LogFilter = {}) {
  try {
    const conditions = []

    if (filters.category && filters.category !== "all") {
      conditions.push(eq(systemLogs.category, filters.category))
    }

    if (filters.level && filters.level !== "all") {
      conditions.push(eq(systemLogs.level, filters.level))
    }

    if (filters.search) {
      conditions.push(like(systemLogs.message, `%${filters.search}%`))
    }

    if (filters.startDate) {
      conditions.push(sql`${systemLogs.createdAt} >= ${filters.startDate.toISOString()}`)
    }

    if (filters.endDate) {
      conditions.push(sql`${systemLogs.createdAt} <= ${filters.endDate.toISOString()}`)
    }

    // Safety check: prevent deleting all logs without any filter unless explicitly intended (maybe add a flag? or just allow it)
    // For now, if no filters are provided, it deletes everything.
    
    await db.delete(systemLogs).where(conditions.length > 0 ? and(...conditions) : undefined)
    revalidatePath("/admin/logs")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete system logs:", error)
    return { success: false, error: "Failed to delete system logs" }
  }
}

export async function deleteOldLogs(beforeDate: Date) {
  try {
    await db.delete(systemLogs).where(lt(systemLogs.createdAt, beforeDate))
    revalidatePath("/admin/logs")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete old logs:", error)
    return { success: false, error: "Failed to delete old logs" }
  }
}

// Keep getLogs for backward compatibility or update it to return email logs
export async function getEmailLogs() {
  try {
    const logs = await db.query.emailHistory.findMany({
      orderBy: (history, { desc }) => [desc(history.createdAt)],
      limit: 100,
    })
    return { success: true, data: logs }
  } catch (error) {
    console.error("Failed to fetch email logs:", error)
    return { success: false, error: "Failed to fetch email logs" }
  }
}

// Alias for backward compatibility if needed, but UI should switch to getSystemLogs
export const getLogs = getEmailLogs

