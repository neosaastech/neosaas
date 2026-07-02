/**
 * "hero" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 */
export interface HeroLayerProps {
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaHref?: string
}

export function HeroLayer({ title, subtitle, ctaLabel, ctaHref }: HeroLayerProps) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{title}</h1>
      {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-hover"
        >
          {ctaLabel}
        </a>
      )}
    </div>
  )
}
