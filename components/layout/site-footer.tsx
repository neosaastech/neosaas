"use client"

import Link from "next/link"
import { usePlatformConfig } from "@/contexts/platform-config-context"
import { useLocale } from "@/lib/i18n/use-locale"
import { FormLayer } from "@/components/layers/form-layer"
import { BlockWrapper } from "@/components/layers/block-wrapper"
import { clientLayerRegistry } from "@/lib/layers/registry-client"
import { shouldShowLogoInHeader, shouldShowSiteNameInHeader } from "@/lib/logo-display"
import { buildClientTemplateVariables, interpolateDeep, interpolateTemplateString } from "@/lib/pages/template-variables-core"
import type { FooterConfig, FooterModule } from "@/types/site-nav"

// Charles (2026-07-14): the footer's own "Columns" module needs to render
// on the public site through this "use client" component — the real
// ColumnsLayer/BlockRenderer (components/layers/columns-layer.tsx) is
// server-only (pulls in lib/pages/template-variables.ts → db → pg, which
// crashes a browser bundle if imported here, found live via a failed
// Vercel build). clientLayerRegistry (already client-safe — the same one
// BlockEditor/BlockPreview use in the admin) has real components for every
// type except "columns" itself (a Noop placeholder, blocks can't nest
// Columns-in-Columns anyway) and blog-list/category-list (DB-backed, no
// client-safe render exists for those either — same "no live preview"
// limit already accepted elsewhere). {{template}} variables ARE
// interpolated here (2026-07-15) via buildClientTemplateVariables — the
// client-safe counterpart of the server builder Pages use, no db/session
// access, so user-scoped tags are always empty (documented convention).
function FooterColumnsGridModule({ columnCount, columns }: { columnCount?: number; columns: { blocks: { layerType: string; props: unknown }[] }[] }) {
  const gridColsClass = columnCount === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
  return (
    <div className={`grid gap-8 ${gridColsClass}`}>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex}>
          {column.blocks.map((block, blockIndex) => {
            const def = clientLayerRegistry[block.layerType]
            if (!def) return null
            const { blockSettings, ...rest } = (block.props ?? {}) as Record<string, unknown>
            const parsed = def.propsSchema.safeParse(rest)
            if (!parsed.success) return null
            const Component = def.component
            return (
              <BlockWrapper key={blockIndex} settings={blockSettings}>
                <Component {...parsed.data} />
              </BlockWrapper>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const DEFAULT_TAGLINE = "All-in-one platform with everything you need to launch, grow, and manage your SaaS business."

const DEFAULT_MODULES: FooterModule[] = [
  {
    type: "links",
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    type: "links",
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
    ],
  },
]

/**
 * Brand block (logo/site name) + tagline + modules grid. Charles
 * (2026-07-15) initially asked for genuinely distinct mobile content, then
 * clarified: in practice the content (tagline, footer menus) is the same
 * across breakpoints — only `hideTaglineOnMobile` is a real per-breakpoint
 * need, handled with a plain `max-md:hidden` class below, no content
 * duplication.
 */
function FooterBody({
  modules,
  tagline,
  hideTagline,
  hideTaglineOnMobile,
  showLogo,
  showSiteName,
  logoSrc,
  siteName,
  locale,
}: {
  modules: FooterModule[]
  tagline?: string
  hideTagline?: boolean
  hideTaglineOnMobile?: boolean
  showLogo: boolean
  showSiteName: boolean
  logoSrc: string
  siteName: string
  locale: string
}) {
  return (
    <div className="grid gap-8 md:grid-cols-3 text-center md:text-left">
      <div className="space-y-4">
        <div className="flex items-center gap-2 justify-center md:justify-start">
          {showLogo && (
            // eslint-disable-next-line @next/next/no-img-element -- external Payload media URL, not a local/optimizable asset
            <img src={logoSrc} alt={siteName} className="h-8 w-auto" />
          )}
          {showSiteName && (
            <div className="font-bold text-xl tracking-tight">
              <span className="text-white">{siteName.substring(0, 3)}</span>
              <span className="text-brand">{siteName.substring(3)}</span>
            </div>
          )}
        </div>
        {!hideTagline && (
          <p className={`text-sm text-white/70 ${hideTaglineOnMobile ? "max-md:hidden" : ""}`}>
            {tagline || DEFAULT_TAGLINE}
          </p>
        )}
      </div>

      {modules.map((module, index) => {
        if (module.type === "links") {
          return (
            <div key={index}>
              {module.title && <h3 className="font-medium mb-4 text-brand">{module.title}</h3>}
              <ul className="space-y-2 flex flex-col items-center md:items-start">
                {module.links.map((link) => (
                  <li key={link.href}>
                    <Link href={`/${locale}${link.href}`} className="text-sm text-white/70 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        if (module.type === "form") {
          return (
            <div key={index}>
              <FormLayer {...module} />
            </div>
          )
        }
        // "columns" is its own multi-column grid — needs the full row, not
        // squeezed into one cell of the outer brand/links grid.
        return (
          <div key={index} className="sm:col-span-2 md:col-span-3">
            <FooterColumnsGridModule columnCount={module.columnCount} columns={module.columns} />
          </div>
        )
      })}
    </div>
  )
}

export function SiteFooter({ footerConfig }: { footerConfig?: FooterConfig | null }) {
  const platformConfig = usePlatformConfig()
  const { siteName, logo, logoDisplayMode } = platformConfig
  const locale = useLocale()

  // Charles (2026-07-15): "j'ai juste date dans le Copyright... merge moi
  // ce qui manque" — same catalog/interpolation Pages already use
  // server-side (lib/pages/template-variables-core.ts), applied here to
  // tagline, copyright AND module content (links/form/columns), not just
  // one hand-rolled {{year}} regex on a single field.
  const variables = buildClientTemplateVariables({
    siteName,
    contactEmail: platformConfig.defaultSenderEmail,
    locale,
    socialLinks: platformConfig.socialLinks,
    hostingProviderName: platformConfig.hostingProviderName,
    hostingProviderAddress: platformConfig.hostingProviderAddress,
    hostingProviderContact: platformConfig.hostingProviderContact,
  })

  const modules = interpolateDeep(footerConfig?.modules?.length ? footerConfig.modules : DEFAULT_MODULES, variables)
  const tagline = interpolateTemplateString(footerConfig?.tagline || DEFAULT_TAGLINE, variables)
  const copyrightText = interpolateTemplateString(
    footerConfig?.copyrightText || `© {{year}} ${siteName}. All rights reserved.`,
    variables,
  )

  // Logo : surcharge du Footer si fournie, sinon logo du site, sinon défaut.
  const logoSrc = footerConfig?.logoUrl || logo || "/images/logo_neolux.jpg"

  // Marque : brandDisplay du Footer prime ; "inherit" (ou absent) retombe sur
  // le logoDisplayMode du tenant — même mécanique que SiteHeader.
  const brand = footerConfig?.brandDisplay
  const showLogo =
    brand && brand !== "inherit" ? brand === "logo" || brand === "both" : shouldShowLogoInHeader(logoDisplayMode)
  const showSiteName =
    brand && brand !== "inherit" ? brand === "siteName" || brand === "both" : shouldShowSiteNameInHeader(logoDisplayMode)

  return (
    <footer className="border-t bg-[#1A1A1A] text-white">
      <div className="container py-10">
        <FooterBody
          modules={modules}
          tagline={tagline}
          hideTagline={footerConfig?.hideTagline}
          hideTaglineOnMobile={footerConfig?.hideTaglineOnMobile}
          showLogo={showLogo}
          showSiteName={showSiteName}
          logoSrc={logoSrc}
          siteName={siteName}
          locale={locale}
        />

        <div className="border-t border-white/10 mt-8 pt-8">
          <p className="text-sm text-white/70 text-center">{copyrightText}</p>
        </div>
      </div>
    </footer>
  )
}
