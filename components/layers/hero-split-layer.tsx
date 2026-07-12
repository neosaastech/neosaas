/**
 * "hero-split" layer — one of the ~845 @neomnia/ui registry blocks that
 * was never actually wired end-to-end (Payload let you pick it, but there
 * was no sync mapping, no preview mapping, and no site-side renderer for
 * it — confirmed live 2026-07-09, Charles: a real page using this block
 * got stuck "Unknown block type: hero-split" and never rendered). Reuses
 * the existing PrelineHeroSplit component (same visual family as "hero")
 * rather than building a new one from scratch — field names differ
 * slightly (highlights vs trustPills, no brandName slot yet) but the
 * layout is the same split-hero-with-icon-grid pattern.
 */
import { PrelineHeroSplit, type PrelineTrustPill } from "@/components/preline/marketing/hero-split"

export interface HeroSplitHighlight {
  icon: string
  label: string
  // Payload gives null for an unset checkbox — kept nullable here to match
  // the Zod schema's defensive .nullable() (registry.ts), not just undefined.
  featured?: boolean | null
}

export interface HeroSplitLayerProps {
  eyebrow?: string
  brandName?: string
  title: string
  subtitle?: string
  highlights?: HeroSplitHighlight[]
  ctaLabel?: string
  ctaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  imageUrl?: string
}

export function HeroSplitLayer({ highlights, ...props }: HeroSplitLayerProps) {
  const trustPills: PrelineTrustPill[] | undefined = highlights?.map((h) => ({ icon: h.icon, label: h.label }))
  return <PrelineHeroSplit {...props} trustPills={trustPills} />
}
