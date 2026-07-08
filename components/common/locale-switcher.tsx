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
 * query string) intact.
 */
export function LocaleSwitcher() {
  const pathname = usePathname()
  const currentLocale = useLocale()

  function pathForLocale(locale: Locale): string {
    const rest = pathname.replace(/^\/(fr|en)/, "")
    return `/${locale}${rest || ""}`
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
            <Link href={pathForLocale(locale)}>{LOCALE_LABELS[locale]}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
