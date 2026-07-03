/**
 * Resolves a FontSource (types/theme-config.ts) into the CSS needed to use it —
 * font-family value, @font-face rule (upload/link), Google Fonts <link> href.
 * Kept generic on purpose: upload and link sources are handled identically once
 * a src URL exists (data: URI vs external URL), google fetches from Google's CSS2 API.
 */
import type { FontSource } from "@/types/theme-config"

export const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

function customFontFamilyName(role: "heading" | "body"): string {
  return `neosaas-custom-${role}`
}

export function resolveFontFamily(source: FontSource | undefined, role: "heading" | "body"): string {
  if (!source || source.type === "system") return SYSTEM_FONT_STACK
  if (source.type === "google") return `"${source.value}", ${SYSTEM_FONT_STACK}`
  return `"${customFontFamilyName(role)}", ${SYSTEM_FONT_STACK}`
}

/** @font-face rule for upload/link sources, or null for system/google (no rule needed). */
export function getFontFaceCSS(source: FontSource | undefined, role: "heading" | "body"): string | null {
  if (!source || (source.type !== "upload" && source.type !== "link")) return null
  return `@font-face { font-family: "${customFontFamilyName(role)}"; src: url("${source.value}"); font-display: swap; }`
}

/**
 * Single Google Fonts CSS2 <link> href covering both heading and body sources
 * (Google Fonts supports multiple families in one request), or null if neither
 * source is 'google'.
 */
export function getGoogleFontsLinkHref(
  headingSource: FontSource | undefined,
  bodySource: FontSource | undefined
): string | null {
  const families = new Set<string>()
  if (headingSource?.type === "google" && headingSource.value) families.add(headingSource.value)
  if (bodySource?.type === "google" && bodySource.value) families.add(bodySource.value)
  if (families.size === 0) return null

  const params = Array.from(families)
    .map((family) => `family=${family.replace(/ /g, "+")}:wght@400;500;600;700`)
    .join("&")
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}
