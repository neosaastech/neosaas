/**
 * Header/footer nav config synced from Payload's per-tenant Header/Footer
 * collections (payload-cms's src/collections/Header.ts, Footer.ts) into this
 * site's own platform_config ('header_config'/'footer_config' keys) — same
 * sync-on-save pattern already used for pages/blog posts/theme, so these
 * components have zero runtime dependency on Payload.
 */
export interface NavLink {
  label: string
  href: string
  children?: NavLink[]
}

export interface HeaderConfig {
  navItems: NavLink[]
  ctaLabel?: string
  ctaHref?: string
}

export interface FooterColumn {
  title: string
  links: NavLink[]
}

export interface FooterConfig {
  columns: FooterColumn[]
  copyrightText?: string
}
