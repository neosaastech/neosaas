/**
 * "hero" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 */
import { Button } from "@/components/ui/button"

export interface HeroLayerProps {
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  imageUrl?: string
}

export function HeroLayer({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  imageUrl,
}: HeroLayerProps) {
  return (
    <div className={imageUrl ? "grid gap-8 md:grid-cols-2 md:items-center" : "mx-auto max-w-3xl text-center"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
        {(ctaLabel && ctaHref) || (secondaryCtaLabel && secondaryCtaHref) ? (
          <div className={imageUrl ? "mt-6 flex flex-wrap gap-3" : "mt-6 flex flex-wrap justify-center gap-3"}>
            {ctaLabel && ctaHref && (
              <Button asChild size="lg">
                <a href={ctaHref}>{ctaLabel}</a>
              </Button>
            )}
            {secondaryCtaLabel && secondaryCtaHref && (
              <Button asChild variant="outline" size="lg">
                <a href={secondaryCtaHref}>{secondaryCtaLabel}</a>
              </Button>
            )}
          </div>
        ) : null}
      </div>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="w-full rounded-xl object-cover" />
      )}
    </div>
  )
}
