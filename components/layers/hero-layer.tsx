/**
 * "hero" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 */
import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/eyebrow"
import * as LucideIcons from "lucide-react"

export interface TrustPill {
  icon: string
  label: string
}

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
}

export function HeroLayer({
  eyebrow,
  title,
  subtitle,
  trustPills,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  imageUrl,
}: HeroLayerProps) {
  return (
    <div className={imageUrl ? "grid gap-8 md:grid-cols-2 md:items-center" : "mx-auto max-w-3xl text-center"}>
      <div>
        {eyebrow && <Eyebrow className={imageUrl ? undefined : "mx-auto"}>{eyebrow}</Eyebrow>}
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
        {trustPills && trustPills.length > 0 && (
          <div className={imageUrl ? "mt-4 flex flex-wrap gap-2" : "mt-4 flex flex-wrap justify-center gap-2"}>
            {trustPills.map((pill) => {
              const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[pill.icon]
              return (
                <span
                  key={pill.label}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {pill.label}
                </span>
              )
            })}
          </div>
        )}
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
