/**
 * "hero" layer — renders via Preline UI split hero block.
 * @see components/preline/marketing/hero-split.tsx
 */
import { PrelineHeroSplit, type PrelineTrustPill } from "@/components/preline/marketing/hero-split"

export type TrustPill = PrelineTrustPill

export interface HeroLayerProps {
  eyebrow?: string
  title: string
  subtitle?: string
  trustPills?: TrustPill[]
  ctaLabel?: string
  ctaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  imageUrl?: string
  videoUrl?: string
}

export function HeroLayer(props: HeroLayerProps) {
  return <PrelineHeroSplit {...props} />
}
