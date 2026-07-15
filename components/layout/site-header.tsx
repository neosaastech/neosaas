"use client"

import Link from "next/link"
import { MainNav } from "@/components/layout/main-nav"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { LocaleSwitcher } from "@/components/common/locale-switcher"
import { Button } from "@/components/ui/button"
import { MobileMenu } from "@/components/layout/mobile-menu"
import { AuthNavButtons } from "@/components/layout/auth-nav-buttons"
import Image from "next/image"
import { Icon } from "@/components/ui/icon"
import { type JWTPayload } from "@/lib/auth"
import { usePlatformConfig } from "@/contexts/platform-config-context"
import { useLocale } from "@/lib/i18n/use-locale"
import { shouldShowLogoInHeader, shouldShowSiteNameInHeader } from "@/lib/logo-display"
import { platformSocialLinksToArray } from "@/lib/social-links"
import { buildClientTemplateVariables, interpolateDeep, interpolateTemplateString } from "@/lib/pages/template-variables-core"
import type { HeaderConfig } from "@/types/site-nav"

interface SiteHeaderProps {
  user?: JWTPayload | null
  headerConfig?: HeaderConfig | null
  /** This page's real per-locale URLs (Joomla-style association), see app/actions/site-nav.ts's getAlternatePagePaths. */
  alternatePaths?: Record<string, string> | null
}

export function SiteHeader({ user, headerConfig, alternatePaths }: SiteHeaderProps) {
  const platformConfig = usePlatformConfig()
  const { siteName, logo, logoDisplayMode, socialLinks: platformSocialLinks } = platformConfig
  const locale = useLocale()

  // Charles (2026-07-15): "le preview ne prend pas en compte le tag merge" —
  // navItems/cta n'avaient jamais reçu le traitement {{tag}} (contrairement
  // au Footer, fait plus tôt) : ni en preview admin, ni sur le site réel,
  // puisque HeaderPreview rend ce même composant. Même mécanisme que
  // site-footer.tsx.
  const variables = buildClientTemplateVariables({
    siteName,
    contactEmail: platformConfig.defaultSenderEmail,
    locale,
    socialLinks: platformConfig.socialLinks,
    hostingProviderName: platformConfig.hostingProviderName,
    hostingProviderAddress: platformConfig.hostingProviderAddress,
    hostingProviderContact: platformConfig.hostingProviderContact,
  })
  const navItems = interpolateDeep(headerConfig?.navItems, variables)
  const ctaLabel = headerConfig?.ctaLabel ? interpolateTemplateString(headerConfig.ctaLabel, variables) : undefined

  // Logo : surcharge du Header si fournie, sinon logo du site, sinon défaut.
  const logoSrc = headerConfig?.logoUrl || logo || "/images/logo_neolux.jpg"

  // Marque : brandDisplay du Header prime ; "inherit" (ou absent) retombe sur
  // le logoDisplayMode du tenant = comportement historique exact.
  const brand = headerConfig?.brandDisplay
  const showLogo =
    brand && brand !== "inherit" ? brand === "logo" || brand === "both" : shouldShowLogoInHeader(logoDisplayMode)
  const showSiteName =
    brand && brand !== "inherit" ? brand === "siteName" || brand === "both" : shouldShowSiteNameInHeader(logoDisplayMode)

  // Toggles : affichés par défaut quand non définis (compat ascendante).
  const showThemeSwitch = headerConfig?.showThemeSwitch !== false
  const showLocaleSwitcher = headerConfig?.showLocaleSwitcher !== false
  const showSocialLinks = headerConfig?.showSocialLinks !== false
  const showAuthButtons = headerConfig?.showAuthButtons !== false
  // Header override si configuré, sinon les vrais réseaux du Tenant
  // (Parameters > Social Media Links) — plus de compte neosaas codé en dur.
  const socialLinks = headerConfig?.socialLinks?.length
    ? headerConfig.socialLinks
    : platformSocialLinksToArray(platformSocialLinks)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            {showLogo && (
              <Image src={logoSrc} alt={siteName} width={32} height={32} className="rounded" />
            )}
            {showSiteName && (
              <span className="font-bold text-lg">
                <span className="text-foreground">{siteName.substring(0, 3)}</span>
                <span className="text-brand">{siteName.substring(3)}</span>
              </span>
            )}
          </Link>
        </div>
        <MainNav items={navItems} />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <MobileMenu user={user} showAuthButtons={showAuthButtons} items={navItems} />
            {ctaLabel && headerConfig?.ctaHref && (
              <Link href={headerConfig.ctaHref} className="hidden md:block">
                <Button size="sm" variant="outline">
                  {ctaLabel}
                </Button>
              </Link>
            )}
            {showSocialLinks && socialLinks.length > 0 && (
              <div className="hidden md:flex items-center space-x-2 mr-2">
                {socialLinks.map((social) => (
                  <Link
                    key={social.url}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={social.icon}
                  >
                    <Icon name={social.icon} className="h-5 w-5" />
                  </Link>
                ))}
              </div>
            )}
            {showLocaleSwitcher && <LocaleSwitcher alternatePaths={alternatePaths} />}
            {showThemeSwitch && <ThemeToggle />}
            {showAuthButtons && (
              <div className="hidden md:flex space-x-1">
                <AuthNavButtons user={user} />
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
