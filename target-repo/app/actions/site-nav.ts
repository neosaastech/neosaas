"use server"

import { db } from "@/db"
import { platformConfig } from "@/db/schema"
import { eq } from "drizzle-orm"
import type { HeaderConfig, FooterConfig } from "@/types/site-nav"

/**
 * Returns null when unset (not an empty config) so callers can tell "no
 * Payload Header doc synced yet" apart from "an editor explicitly saved an
 * empty nav" — the former should fall back to the site's hardcoded nav,
 * the latter should render nothing.
 */
export async function getHeaderConfig(): Promise<HeaderConfig | null> {
  try {
    const result = await db.select().from(platformConfig).where(eq(platformConfig.key, "header_config")).limit(1)
    if (result.length === 0 || !result[0].value) return null
    return JSON.parse(result[0].value) as HeaderConfig
  } catch (error) {
    console.error("Failed to get header config:", error)
    return null
  }
}

export async function getFooterConfig(): Promise<FooterConfig | null> {
  try {
    const result = await db.select().from(platformConfig).where(eq(platformConfig.key, "footer_config")).limit(1)
    if (result.length === 0 || !result[0].value) return null
    return JSON.parse(result[0].value) as FooterConfig
  } catch (error) {
    console.error("Failed to get footer config:", error)
    return null
  }
}
