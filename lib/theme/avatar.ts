/**
 * DiceBear avatar generation (module Iconographie, Pilier D). DiceBear generates
 * a seeded illustration/avatar per style — https://api.dicebear.com, no package
 * needed (plain HTTP image URLs). Already used ad-hoc in
 * app/(public)/dashboard-exemple/page.tsx (hardcoded "avataaars" seeds); this
 * generalizes it to an admin-configurable default style.
 *
 * Distinct from the Icon Library (components/ui/icon.tsx, Lucide/Tabler/
 * Heroicons) on purpose: those are named semantic glyphs ("home", "settings"),
 * DiceBear has no such concept — it's a per-seed generated illustration, used
 * for user/company avatar fallbacks, not UI icons.
 */

export interface DiceBearStyleEntry {
  id: string
  label: string
}

export const DICEBEAR_STYLES: DiceBearStyleEntry[] = [
  { id: "avataaars", label: "Avataaars" },
  { id: "adventurer", label: "Adventurer" },
  { id: "big-smile", label: "Big Smile" },
  { id: "bottts", label: "Bottts (robots)" },
  { id: "croodles", label: "Croodles" },
  { id: "fun-emoji", label: "Fun Emoji" },
  { id: "identicon", label: "Identicon" },
  { id: "initials", label: "Initials" },
  { id: "lorelei", label: "Lorelei" },
  { id: "micah", label: "Micah" },
  { id: "notionists", label: "Notionists" },
  { id: "open-peeps", label: "Open Peeps" },
  { id: "personas", label: "Personas" },
  { id: "pixel-art", label: "Pixel Art" },
  { id: "shapes", label: "Shapes" },
  { id: "thumbs", label: "Thumbs" },
]

export const DEFAULT_DICEBEAR_STYLE = "avataaars"

/**
 * Builds a DiceBear SVG avatar URL for a given seed (e.g. user id, email, or name)
 * and style. Falls back to DEFAULT_DICEBEAR_STYLE if style is missing/invalid.
 */
export function getAvatarUrl(seed: string, style: string = DEFAULT_DICEBEAR_STYLE): string {
  const validStyle = DICEBEAR_STYLES.some((s) => s.id === style) ? style : DEFAULT_DICEBEAR_STYLE
  return `https://api.dicebear.com/9.x/${validStyle}/svg?seed=${encodeURIComponent(seed)}`
}
