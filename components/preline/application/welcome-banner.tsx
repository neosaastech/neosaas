/**
 * Preline Application UI — gradient welcome banner (dashboard / private areas).
 * @see https://www.preline.co/examples/banners.html
 */
import Link from "next/link"

export interface PrelineWelcomeBannerProps {
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaHref?: string
}

export function PrelineWelcomeBanner({ title, subtitle, ctaLabel, ctaHref }: PrelineWelcomeBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-linear-to-r from-[#1A1A1A] to-brand p-8 text-white">
      <div className="relative z-10">
        <h1 className="mb-2 text-3xl font-bold">{title}</h1>
        {subtitle && (
          <div className="max-w-2xl text-white/90 [&_p]:m-0" dangerouslySetInnerHTML={{ __html: subtitle }} />
        )}
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
      <div className="absolute right-0 top-0 h-full w-1/3 bg-linear-to-l from-white/10 to-transparent" />
    </div>
  )
}
