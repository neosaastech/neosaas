/**
 * "cta-banner" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 */
import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/eyebrow"

export interface CtaBannerLayerProps {
  eyebrow?: string
  title: string
  subtitle?: string
  ctaLabel: string
  ctaHref: string
}

export function CtaBannerLayer({ eyebrow, title, subtitle, ctaLabel, ctaHref }: CtaBannerLayerProps) {
  return (
    <div className="mx-auto mt-16 max-w-4xl rounded-2xl bg-brand px-6 py-12 text-center text-white sm:px-12">
      {eyebrow && <Eyebrow className="text-white/80">{eyebrow}</Eyebrow>}
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-3 text-white/80">{subtitle}</p>}
      <Button asChild size="lg" className="mt-6 bg-white text-brand hover:bg-white/90">
        <a href={ctaHref}>{ctaLabel}</a>
      </Button>
    </div>
  )
}
