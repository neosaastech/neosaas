"use client"

import Link from "next/link"
import { usePlatformConfig } from "@/contexts/platform-config-context"
import { useLocale } from "@/lib/i18n/use-locale"
import type { FooterConfig } from "@/types/site-nav"

const DEFAULT_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Brand", href: "/brand" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/legacy/about" },
      { label: "Contact", href: "/legacy/contact" },
      { label: "Affiliates", href: "/legacy/affiliate" },
    ],
  },
]

export function SiteFooter({ footerConfig }: { footerConfig?: FooterConfig | null }) {
  const { siteName } = usePlatformConfig()
  const locale = useLocale()
  const columns = footerConfig?.columns?.length ? footerConfig.columns : DEFAULT_COLUMNS

  return (
    <footer className="border-t bg-[#1A1A1A] text-white">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-3 text-center md:text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <div className="font-bold text-xl tracking-tight">
                <span className="text-white">{siteName.substring(0, 3)}</span>
                <span className="text-brand">{siteName.substring(3)}</span>
              </div>
            </div>
            <p className="text-sm text-white/70">
              All-in-one platform with everything you need to launch, grow, and manage your SaaS business.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-medium mb-4 text-brand">{column.title}</h3>
              <ul className="space-y-2 flex flex-col items-center md:items-start">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={`/${locale}${link.href}`} className="text-sm text-white/70 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-8 pt-8">
          <p className="text-sm text-white/70 text-center">
            {footerConfig?.copyrightText || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  )
}
