'use server'

import { db } from "@/db"
import { platformConfig } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

export async function updateTosPosition(position: "center" | "bottom-left" | "bottom-right") {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.some(r => ['admin', 'super_admin'].includes(r))) {
      return { success: false, error: "Unauthorized" }
    }

    await db.insert(platformConfig)
      .values({
        key: "tos_position",
        value: position,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: platformConfig.key,
        set: {
          value: position,
          updatedAt: new Date()
        }
      })

    revalidatePath("/")
    return { success: true, message: "ToS position updated" }
  } catch (error) {
    console.error("Failed to update ToS position:", error)
    return { success: false, error: "Failed to update position" }
  }
}

export async function updateCookieSettings(settings: { 
  showLogo: boolean, 
  enabled: boolean, 
  message: string,
  position?: "bottom-left" | "bottom-right"
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.some(r => ['admin', 'super_admin'].includes(r))) {
      return { success: false, error: "Unauthorized" }
    }

    // Update show_cookie_logo
    await db.insert(platformConfig)
      .values({
        key: "show_cookie_logo",
        value: String(settings.showLogo),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: platformConfig.key,
        set: {
          value: String(settings.showLogo),
          updatedAt: new Date()
        }
      })

    // Update cookie_consent_enabled
    await db.insert(platformConfig)
      .values({
        key: "cookie_consent_enabled",
        value: String(settings.enabled),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: platformConfig.key,
        set: {
          value: String(settings.enabled),
          updatedAt: new Date()
        }
      })

    // Update cookie_consent_message
    await db.insert(platformConfig)
      .values({
        key: "cookie_consent_message",
        value: settings.message,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: platformConfig.key,
        set: {
          value: settings.message,
          updatedAt: new Date()
        }
      })

    // Update cookie_position
    if (settings.position) {
      await db.insert(platformConfig)
        .values({
          key: "cookie_position",
          value: settings.position,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: platformConfig.key,
          set: {
            value: settings.position,
            updatedAt: new Date()
          }
        })
    }

    revalidatePath("/", "layout")
    revalidatePath("/admin/legal")
    return { success: true, message: "Cookie settings updated" }
  } catch (error) {
    console.error("Failed to update cookie settings:", error)
    return { success: false, error: "Failed to update cookie settings" }
  }
}

export async function updateHostingSettings(settings: {
  name: string,
  address: string,
  contact: string
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.some(r => ['admin', 'super_admin'].includes(r))) {
      return { success: false, error: "Unauthorized" }
    }

    const updates = [
      { key: "hosting_provider_name", value: settings.name },
      { key: "hosting_provider_address", value: settings.address },
      { key: "hosting_provider_contact", value: settings.contact }
    ]

    for (const update of updates) {
      await db.insert(platformConfig)
        .values({
          key: update.key,
          value: update.value,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: platformConfig.key,
          set: {
            value: update.value,
            updatedAt: new Date()
          }
        })
    }

    revalidatePath("/legal/terms")
    return { success: true, message: "Hosting settings updated" }
  } catch (error) {
    console.error("Failed to update hosting settings:", error)
    return { success: false, error: "Failed to update hosting settings" }
  }
}
