import type React from "react"
import { notFound } from "next/navigation"

export const LOCALES = ["fr", "en"] as const
export type Locale = (typeof LOCALES)[number]

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!LOCALES.includes(locale as Locale)) {
    notFound()
  }

  return children
}
