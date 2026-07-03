/**
 * "cta-banner" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 */
export interface CtaBannerLayerProps {
  title: string
  subtitle?: string
  ctaLabel: string
  ctaHref: string
}

export function CtaBannerLayer({ title, subtitle, ctaLabel, ctaHref }: CtaBannerLayerProps) {
  return (
    <div className="mx-auto mt-16 max-w-4xl rounded-2xl bg-brand px-6 py-12 text-center text-white sm:px-12">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-3 text-white/80">{subtitle}</p>}
      <a
        href={ctaHref}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-medium text-brand hover:bg-white/90"
      >
        {ctaLabel}
      </a>
    </div>
  )
}
