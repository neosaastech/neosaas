"use client"

/**
 * Icon abstraction (Pilier D — Icônes & bibliothèques de styles configurables).
 * Resolves an icon name against the platform's configured icon library
 * (`platform_config` → `theme_config.iconLibrary`) instead of importing
 * `lucide-react` directly. Existing direct `lucide-react` imports (188 files)
 * are left untouched — migrated opportunistically, not in one pass.
 */

import { useMemo } from "react"
import * as LucideIcons from "lucide-react"
import * as TablerIcons from "@tabler/icons-react"
import * as HeroIcons from "@heroicons/react/24/outline"
// Charles (2026-07-15): "on doit meme retrover les icones des app et
// services" — brand/product logos (Stripe, Slack, GitHub...), not generic
// UI glyphs. react-icons/si wraps the Simple Icons set (~3000 brands) as
// real React components (SiStripe, SiSlack...), same {className} shape as
// the other three libraries — no raw-SVG-path plumbing needed.
import * as SimpleIcons from "react-icons/si"
import type { LucideProps } from "lucide-react"

export const ICON_LIBRARIES = ["lucide", "tabler", "heroicons", "brands"] as const
export type IconLibrary = (typeof ICON_LIBRARIES)[number]

export const ICON_LIBRARY_LABELS: Record<IconLibrary, string> = {
  lucide: "Lucide",
  tabler: "Tabler Icons",
  heroicons: "Heroicons",
  brands: "Marques (Simple Icons)",
}

/**
 * Names differ between libraries for the same glyph. Only the icons used in
 * the admin preview (and any name explicitly added here) are mapped —
 * anything else falls back to Lucide with a console warning rather than
 * crashing, since most of the app still imports lucide-react directly.
 */
const NAME_MAP: Record<string, Partial<Record<IconLibrary, string>>> = {
  home: { lucide: "Home", tabler: "IconHome", heroicons: "HomeIcon" },
  user: { lucide: "User", tabler: "IconUser", heroicons: "UserIcon" },
  settings: { lucide: "Settings", tabler: "IconSettings", heroicons: "Cog6ToothIcon" },
  check: { lucide: "Check", tabler: "IconCheck", heroicons: "CheckIcon" },
  close: { lucide: "X", tabler: "IconX", heroicons: "XMarkIcon" },
}

type IconComponent = React.ComponentType<{ className?: string } & Partial<LucideProps>>

/**
 * Charles (2026-07-15): "plusieurs bibliothèques d'icônes dans nos modules"
 * — module block fields (feature grid, pricing table, social links...)
 * store a single string. Rather than thread a second `library` field
 * through every block/collection/sync path, a non-Lucide pick is prefixed
 * ("tabler:IconRocket", "heroicons:RocketLaunchIcon") right in that one
 * string — a bare name (all existing content, saved before this) still
 * means Lucide, unprefixed, unchanged.
 */
export function parseIconValue(value: string): { library: IconLibrary; name: string } {
  const separatorIndex = value.indexOf(":")
  if (separatorIndex > 0) {
    const prefix = value.slice(0, separatorIndex)
    if ((ICON_LIBRARIES as readonly string[]).includes(prefix)) {
      return { library: prefix as IconLibrary, name: value.slice(separatorIndex + 1) }
    }
  }
  return { library: "lucide", name: value }
}

function resolveIcon(name: string, library: IconLibrary): IconComponent | null {
  const mapped = NAME_MAP[name]?.[library]
  const key = mapped ?? name

  if (library === "tabler") {
    return ((TablerIcons as unknown as Record<string, IconComponent>)[key]) ?? null
  }
  if (library === "heroicons") {
    return ((HeroIcons as unknown as Record<string, IconComponent>)[key]) ?? null
  }
  if (library === "brands") {
    return ((SimpleIcons as unknown as Record<string, IconComponent>)[key]) ?? null
  }
  return ((LucideIcons as unknown as Record<string, IconComponent>)[key]) ?? null
}

export interface IconProps {
  /**
   * Canonical name — one of NAME_MAP's keys, a direct Lucide export name, or
   * (since this field can hold icons from any of the three libraries) a
   * `"tabler:IconX"` / `"heroicons:XIcon"`-prefixed name. `library` below
   * still works as an explicit override for callers that already track the
   * library separately (e.g. the platform-wide default in theme_config).
   */
  name: string
  library?: IconLibrary
  className?: string
}

export function Icon({ name, library, className }: IconProps) {
  const Component = useMemo(() => {
    const parsed = library ? { library, name } : parseIconValue(name)
    const resolved = resolveIcon(parsed.name, parsed.library)
    if (resolved) return resolved
    if (parsed.library !== "lucide") {
      console.warn(`[Icon] "${parsed.name}" not found in "${parsed.library}", falling back to Lucide`)
      return resolveIcon(parsed.name, "lucide")
    }
    return null
  }, [name, library])

  if (!Component) return null
  return <Component className={className} />
}
