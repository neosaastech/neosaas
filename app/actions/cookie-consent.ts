'use server'

import { db } from "@/db"
import { cookieConsents } from "@/db/schema"
import { headers } from "next/headers"
import { eq, inArray } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function saveCookieConsent(status: 'accepted' | 'declined') {
  try {
    const headersList = await headers()
    const ip = headersList.get("x-forwarded-for") || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    await db.insert(cookieConsents).values({
      ipAddress: ip,
      userAgent: userAgent,
      consentStatus: status,
      consentedAt: new Date(),
      updatedAt: new Date()
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to save cookie consent:", error)
    return { success: false, error: "Failed to save consent" }
  }
}

export async function getCookieConsents() {
  try {
    const consents = await db.select().from(cookieConsents).orderBy(cookieConsents.consentedAt)
    return { success: true, data: consents }
  } catch (error) {
    console.error("Failed to fetch cookie consents:", error)
    return { success: false, error: "Failed to fetch consents" }
  }
}

export async function deleteCookieConsent(id: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.some(r => ['admin', 'super_admin'].includes(r))) {
      return { success: false, error: "Unauthorized" }
    }

    await db.delete(cookieConsents).where(eq(cookieConsents.id, id))
    
    revalidatePath("/admin/legal")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete cookie consent:", error)
    return { success: false, error: "Failed to delete consent" }
  }
}

export async function deleteCookieConsents(ids: string[]) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.some(r => ['admin', 'super_admin'].includes(r))) {
      return { success: false, error: "Unauthorized" }
    }

    if (ids.length === 0) {
      return { success: false, error: "No consents selected" }
    }

    await db.delete(cookieConsents).where(inArray(cookieConsents.id, ids))
    
    revalidatePath("/admin/legal")
    return { success: true, message: `${ids.length} consent(s) deleted` }
  } catch (error) {
    console.error("Failed to delete cookie consents:", error)
    return { success: false, error: "Failed to delete consents" }
  }
}
