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
import type { LucideProps } from "lucide-react"

export const ICON_LIBRARIES = ["lucide", "tabler", "heroicons"] as const
export type IconLibrary = (typeof ICON_LIBRARIES)[number]

export const ICON_LIBRARY_LABELS: Record<IconLibrary, string> = {
  lucide: "Lucide",
  tabler: "Tabler Icons",
  heroicons: "Heroicons",
}

/**
 * Names differ between libraries for the same glyph. Only the icons used in
 * the admin preview (and any name explicitly added here) are mapped —
 * anything else falls back to Lucide with a console warning rather than
 * crashing, since most of the app still imports lucide-react directly.
 */
const NAME_MAP: Record<string, Record<IconLibrary, string>> = {
  home: { lucide: "Home", tabler: "IconHome", heroicons: "HomeIcon" },
  user: { lucide: "User", tabler: "IconUser", heroicons: "UserIcon" },
  settings: { lucide: "Settings", tabler: "IconSettings", heroicons: "Cog6ToothIcon" },
  check: { lucide: "Check", tabler: "IconCheck", heroicons: "CheckIcon" },
  close: { lucide: "X", tabler: "IconX", heroicons: "XMarkIcon" },
}

type IconComponent = React.ComponentType<{ className?: string } & Partial<LucideProps>>

function resolveIcon(name: string, library: IconLibrary): IconComponent | null {
  const mapped = NAME_MAP[name]?.[library]
  const key = mapped ?? name

  if (library === "tabler") {
    return ((TablerIcons as unknown as Record<string, IconComponent>)[key]) ?? null
  }
  if (library === "heroicons") {
    return ((HeroIcons as unknown as Record<string, IconComponent>)[key]) ?? null
  }
  return ((LucideIcons as unknown as Record<string, IconComponent>)[key]) ?? null
}

export interface IconProps {
  /** Canonical name — one of NAME_MAP's keys, or a direct Lucide export name. */
  name: string
  library?: IconLibrary
  className?: string
}

export function Icon({ name, library = "lucide", className }: IconProps) {
  const Component = useMemo(() => {
    const resolved = resolveIcon(name, library)
    if (resolved) return resolved
    if (library !== "lucide") {
      console.warn(`[Icon] "${name}" not found in "${library}", falling back to Lucide`)
      return resolveIcon(name, "lucide")
    }
    return null
  }, [name, library])

  if (!Component) return null
  return <Component className={className} />
}
