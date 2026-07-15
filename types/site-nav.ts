import type { FormLayerProps } from "@/components/layers/form-layer"
import type { ColumnsLayerProps } from "@/components/layers/columns-layer"

/**
 * Header/footer nav config synced from Payload's per-tenant Header/Footer
 * collections (payload-cms's src/collections/Header.ts, Footer.ts) into this
 * site's own platform_config ('header_config'/'footer_config' keys, the
 * tenant-wide Default) or header_overrides/footer_overrides (scoped to a
 * Page/Category/PageType, see app/actions/site-nav.ts's resolution logic) —
 * same sync-on-save pattern already used for pages/blog posts/theme, so
 * these components have zero runtime dependency on Payload.
 */
export interface NavLink {
  label: string
  href: string
  children?: NavLink[]
}

export interface SocialLink {
  /** Lucide icon export name (e.g. "Linkedin", "Github"), rendered via components/ui/icon.tsx. */
  icon: string
  url: string
}

/**
 * "inherit" (or absent) = keep the tenant's own logoDisplayMode/platformConfig
 * behaviour (backward compatible). Any other value forces the header's brand
 * display regardless of the site-wide setting.
 */
export type BrandDisplay = "inherit" | "logo" | "siteName" | "both" | "none"

export interface HeaderConfig {
  navItems: NavLink[]
  ctaLabel?: string
  ctaHref?: string
  // Réglages 2026-07-13 — tous optionnels, absents = comportement historique.
  brandDisplay?: BrandDisplay
  logoUrl?: string
  showThemeSwitch?: boolean
  showLocaleSwitcher?: boolean
  showSocialLinks?: boolean
  showAuthButtons?: boolean
  socialLinks?: SocialLink[]
}

/**
 * Charles (2026-07-14): "on doit modifier le form module par le choix de
 * module ... on peut même ajouter le module colonne qui existe déjà sur
 * page" — replaces the old fixed `columns`(links-only)/`formModule`(single,
 * bottom-only) fields with an open, optional choice of modules per Footer.
 * `columns` here reuses ColumnsLayerProps verbatim (same "Columns" module
 * Pages already render via components/layers/columns-layer.tsx).
 */
export type FooterModule =
  | ({ type: "links"; title?: string; links: NavLink[] })
  | ({ type: "form" } & FormLayerProps)
  | ({ type: "columns" } & ColumnsLayerProps)

export interface FooterConfig {
  modules: FooterModule[]
  copyrightText?: string
  /** Tagline under the logo — Charles (2026-07-15): was hardcoded in site-footer.tsx, no way to edit or hide it. */
  tagline?: string
  /** true = render nothing under the logo, regardless of `tagline`/the site default. */
  hideTagline?: boolean
  /**
   * Charles (2026-07-15): after "distinct mobile content" turned out to
   * mean "same content, hide/show via CSS" (content — tagline, footer
   * menus — is generally identical across breakpoints), this is the only
   * mobile-specific toggle actually needed: same tagline text, just not
   * rendered below `md`.
   */
  hideTaglineOnMobile?: boolean
  brandDisplay?: BrandDisplay
  logoUrl?: string
}

/**
 * A resolved Module's content (Charles, 2026-07-14: reusable content
 * injected at a specific position inside a page, via a `module-anchor`
 * block) — same `{layerType, props}` shape page_layers rows already use, so
 * BlockRenderer's existing per-block rendering is reused as-is, just fed
 * from `getModuleForAnchor` (app/actions/site-nav.ts) instead of a
 * page_layers query.
 */
export interface ModuleConfig {
  blocks: Array<{ layerType: string; props: Record<string, unknown> }>
}
