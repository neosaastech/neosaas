'use server'

import { db } from "@/db"
import { pagePermissions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type AccessLevel = "public" | "user" | "admin" | "super-admin"

export async function getPages() {
  try {
    const pages = await db.select().from(pagePermissions).orderBy(pagePermissions.path)
    return { success: true, data: pages }
  } catch (error) {
    console.error("Failed to fetch pages:", error)
    return { success: false, error: "Failed to fetch pages" }
  }
}

export async function updatePageAccess(path: string, access: AccessLevel) {
  try {
    await db.update(pagePermissions)
      .set({ access, updatedAt: new Date() })
      .where(eq(pagePermissions.path, path))
    
    revalidatePath("/admin/pages")
    return { success: true, message: "Page access updated successfully" }
  } catch (error) {
    console.error("Failed to update page access:", error)
    return { success: false, error: "Failed to update page access" }
  }
}

export async function syncPages(pages: { path: string, name: string, group: string, access: AccessLevel }[]) {
  try {
    for (const page of pages) {
      await db.insert(pagePermissions)
        .values({
          path: page.path,
          name: page.name,
          group: page.group,
          access: page.access
        })
        .onConflictDoNothing({ target: pagePermissions.path })
    }
    revalidatePath("/admin/pages")
    return { success: true, message: "Pages synced successfully" }
  } catch (error) {
    console.error("Failed to sync pages:", error)
    return { success: false, error: "Failed to sync pages" }
  }
}
