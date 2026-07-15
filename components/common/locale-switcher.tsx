"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LOCALES, type Locale } from "@/app/[locale]/layout"
import { useLocale } from "@/lib/i18n/use-locale"

const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
}

/**
 * Confirmed missing entirely (2026-07-08, Charles) — /fr and /en routing
 * existed in the code but visitors had no UI to switch between them. Swaps
 * only the leading /fr or /en segment, keeps the rest of the path (and
 * query string) intact — the fallback when `alternatePaths` has nothing for
 * a locale, i.e. the same behavior this component always had before
 * 2026-07-15.
 *
 * `alternatePaths` (from getAlternatePagePaths, app/actions/site-nav.ts) is
 * this page's real Joomla-style association — now that Pages.slug/path are
 * localized (fr and en can have genuinely different URLs), a blind prefix
 * swap would 404 on a page whose English slug differs from its French one.
 * Passed down from the public layout, which already resolves `pagePath`.
 */
export function LocaleSwitcher({ alternatePaths }: { alternatePaths?: Record<string, string> | null }) {
  const pathname = usePathname()
  const currentLocale = useLocale()

  function pathForLocale(locale: Locale): string {
    const alternate = alternatePaths?.[locale]
    if (alternate) return `/${locale}${alternate === "/" ? "" : alternate}`
    const rest = pathname.replace(/^\/(fr|en)/, "")
    return `/${locale}${rest || ""}`
  }

  // Persists a manual choice so a later visit to the bare domain
  // (neosaas.tech, no /fr or /en) honors it instead of re-running the
  // Accept-Language guess in proxy.ts's detectPreferredLocale.
  function rememberLocale(locale: Locale) {
    document.cookie = `preferred-locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Changer de langue</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((locale) => (
          <DropdownMenuItem key={locale} asChild disabled={locale === currentLocale}>
            <Link href={pathForLocale(locale)} onClick={() => rememberLocale(locale)}>
              {LOCALE_LABELS[locale]}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
