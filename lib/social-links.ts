import type { PlatformSocialLinks } from "@/contexts/platform-config-context"
import type { PayloadSocialLink } from "@/lib/payload-bridge"

/**
 * Parameters' Social Media Links form (app/(private)/admin/settings/page.tsx)
 * stores a fixed 5-key object with plain URL strings. Header's own
 * `socialLinks` field is an {icon, url}[] array (lucide icon name + url) —
 * this maps one to the other using the same key -> lucide icon name pairing
 * already used by Parameters' own icons (Twitter, Facebook, Linkedin,
 * Instagram, Github, all confirmed present in the installed lucide-react).
 */
const PLATFORM_ICON_MAP: Record<keyof PlatformSocialLinks, string> = {
  twitter: "Twitter",
  facebook: "Facebook",
  linkedin: "Linkedin",
  instagram: "Instagram",
  github: "Github",
}

export function platformSocialLinksToArray(social?: PlatformSocialLinks | null): PayloadSocialLink[] {
  if (!social) return []
  return (Object.keys(PLATFORM_ICON_MAP) as (keyof PlatformSocialLinks)[])
    .filter((key) => social[key])
    .map((key) => ({ icon: PLATFORM_ICON_MAP[key], url: social[key] as string }))
}
