/**
 * Logo + colored site-name lockup — extracted from PrivateSidebar's header
 * block (the one "real" dynamic brand treatment already in the app) so the
 * Documentation shell can reuse it instead of a one-off, plain-text nav
 * title (Charles, 2026-07-12: "on devrait plutôt récupérer l'adaptation
 * dynamique"). Pure/presentational — no hooks — so it works from both a
 * server component (documentation/layout.tsx) and a client one (sidebar.tsx).
 */
import { SiteNameText } from "./site-name-text"

interface BrandMarkProps {
  siteName: string
  siteNameStyle?: "plain" | "legacy-bicolor" | "custom"
  siteNameHtml?: string | null
  logo?: string | null
  showLogo?: boolean
  showSiteName?: boolean
  size?: "sm" | "md"
}

export function BrandMark({ siteName, siteNameStyle, siteNameHtml, logo, showLogo = true, showSiteName = true, size = "md" }: BrandMarkProps) {
  const logoInitials = siteName.substring(0, 2).toUpperCase()
  const dim = size === "sm" ? "h-6 w-6" : "h-8 w-8"
  const textSize = size === "sm" ? "text-lg" : "text-xl"

  return (
    <span className="inline-flex items-center gap-2">
      {showLogo &&
        (logo ? (
          <img src={logo} alt={siteName} className={`${dim} object-contain`} />
        ) : (
          <span className={`flex ${dim} items-center justify-center rounded-lg bg-brand text-primary-foreground text-xs font-bold`}>
            {logoInitials}
          </span>
        ))}
      {showSiteName && (
        <SiteNameText
          siteName={siteName}
          siteNameStyle={siteNameStyle}
          siteNameHtml={siteNameHtml}
          className={`font-bold ${textSize}`}
        />
      )}
    </span>
  )
}
