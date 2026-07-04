'use server'

import { db } from "@/db"
import { pagePermissions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { RequiredRoleLevel } from "@/lib/auth/page-access"
import { listPages, type PayloadPageSummary } from "@/lib/payload-bridge"

// Was its own "public" | "user" | "admin" | "super-admin" (hyphen) union,
// never matching the "super_admin" (underscore) string actually used by
// every consumer (components/admin/pages-settings.tsx, db/schema.ts,
// lib/pilot/actions.ts) — reusing the canonical type kills that drift at
// the source instead of fixing the typo in two places that can re-diverge.
export type AccessLevel = RequiredRoleLevel

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

/**
 * First slice of the unified Pages screen (Notion "Payload CMS multi-site"
 * — bridge decision 2026-07-04): real content pages authored in the
 * central Payload, fetched read-only via the server-side bridge
 * (lib/payload-bridge.ts). This app never writes this data directly —
 * creation/editing happens in Payload (either its own admin for now, or a
 * future embedded form here), this action only lists what already exists.
 */
export async function getContentPages(): Promise<
  { success: true; data: PayloadPageSummary[] } | { success: false; error: string }
> {
  try {
    const pages = await listPages()
    return { success: true, data: pages }
  } catch (error) {
    console.error("Failed to fetch content pages from Payload:", error)
    return { success: false, error: "Failed to fetch content pages" }
  }
}
