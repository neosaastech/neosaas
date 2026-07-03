"use client"

import { useParams } from "next/navigation"
import { LOCALES, type Locale } from "@/app/[locale]/layout"

const DEFAULT_LOCALE: Locale = "fr"

/**
 * Current locale for client components nested under app/[locale]/(public).
 * Falls back to the default locale for components also rendered outside
 * that segment (e.g. a private/admin page linking out to a public route) —
 * `useParams()` simply won't have a `locale` key there.
 */
export function useLocale(): Locale {
  const params = useParams()
  const raw = params?.locale
  const value = Array.isArray(raw) ? raw[0] : raw
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE
}
