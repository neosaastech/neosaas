/**
 * Renders the site name per the admin-chosen style — the single place this
 * decision is made, instead of each header/footer/sidebar/error-page
 * duplicating its own "first 3 chars / rest" split (found 2026-08-25: 6
 * separate copies of that split across the app, hardcoded for "NeoSaaS"
 * and silently wrong for any other site name).
 *
 * - "plain" (default): single color, no split — works for any site name.
 * - "legacy-bicolor": the original substring(0,3)/substring(3) two-tone
 *   look, kept for sites (like this one) that already rely on it.
 * - "custom": admin-authored markup rendered verbatim (siteNameHtml) —
 *   same trust level as customHeaderCode/customFooterCode, both already
 *   rendered via dangerouslySetInnerHTML elsewhere in this app.
 *
 * Pure/presentational, no hooks — works from server and client components
 * alike (same reasoning as BrandMark, which uses this internally).
 */
interface SiteNameTextProps {
  siteName: string
  siteNameStyle?: "plain" | "legacy-bicolor" | "custom"
  siteNameHtml?: string | null
  className?: string
  // "legacy-bicolor" only: color of the fixed first-3-chars prefix. Not
  // always "text-foreground" — a dark-background footer needs "text-white"
  // regardless of theme, since "text-foreground" tracks light/dark mode.
  prefixClassName?: string
  accentClassName?: string
}

export function SiteNameText({
  siteName,
  siteNameStyle = "plain",
  siteNameHtml,
  className,
  prefixClassName = "text-foreground",
  accentClassName = "text-brand",
}: SiteNameTextProps) {
  if (siteNameStyle === "custom" && siteNameHtml) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: siteNameHtml }} />
  }

  if (siteNameStyle === "legacy-bicolor") {
    return (
      <span className={className}>
        <span className={prefixClassName}>{siteName.substring(0, 3)}</span>
        <span className={accentClassName}>{siteName.substring(3)}</span>
      </span>
    )
  }

  return <span className={className}>{siteName}</span>
}
