/**
 * Preline UI — Split Hero with review chips (free block pattern).
 * @see https://www.preline.co/examples/hero-sections.html
 */
import Link from "next/link"
import { Star } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { PrelineIconShowcasePanel } from "@/components/preline/marketing/icon-showcase-panel"

export interface PrelineTrustPill {
  icon: string
  label: string
}

export interface PrelineHeroSplitProps {
  eyebrow?: string
  title: string
  subtitle?: string
  trustPills?: PrelineTrustPill[]
  ctaLabel?: string
  ctaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  imageUrl?: string
  videoUrl?: string
}

export function PrelineHeroSplit({
  eyebrow,
  title,
  subtitle,
  trustPills,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  imageUrl,
  videoUrl,
}: PrelineHeroSplitProps) {
  return (
    <div className="relative overflow-hidden bg-linear-to-b from-background to-muted/40">
      <div className="container px-4 py-12 sm:px-6 md:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            {eyebrow && (
              <p className="inline-flex items-center gap-x-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl lg:leading-tight">
              {title}
            </h1>
            {subtitle && (
              <div
                className="mt-4 text-lg text-muted-foreground md:text-xl [&_p]:m-0"
                dangerouslySetInnerHTML={{ __html: subtitle }}
              />
            )}

            {trustPills && trustPills.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {trustPills.map((pill) => {
                  const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[pill.icon]
                  return (
                    <span
                      key={pill.label}
                      className="inline-flex items-center gap-x-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-xs"
                    >
                      {Icon ? <Icon className="size-4 text-brand" /> : null}
                      {pill.label}
                    </span>
                  )
                })}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {ctaLabel && ctaHref && (
                <Link
                  href={ctaHref}
                  className="inline-flex items-center justify-center gap-x-2 rounded-lg border border-transparent bg-brand px-4 py-3 text-sm font-medium text-white shadow-xs transition hover:bg-brand/90 focus:outline-hidden focus:ring-2 focus:ring-brand focus:ring-offset-2"
                >
                  {ctaLabel}
                </Link>
              )}
              {secondaryCtaLabel && secondaryCtaHref && (
                <Link
                  href={secondaryCtaHref}
                  className="inline-flex items-center justify-center gap-x-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-xs transition hover:bg-muted focus:outline-hidden focus:ring-2 focus:ring-brand focus:ring-offset-2"
                >
                  {secondaryCtaLabel}
                </Link>
              )}
            </div>

            {/* Review chips — Preline pattern */}
            <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-border pt-6">
              <div className="flex items-center gap-x-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">4.8</span> /5
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Trusted by modern SaaS teams</p>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <PrelineIconShowcasePanel
                imageUrl={imageUrl}
                videoUrl={videoUrl}
                overlayIcons={!(imageUrl || videoUrl)}
                className="aspect-4/3 h-auto max-w-full w-full"
              />
            </div>
            <div className="pointer-events-none absolute -inset-e-6 -top-6 size-24 rounded-full bg-brand/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-6 -inset-s-6 size-32 rounded-full bg-brand/10 blur-3xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
