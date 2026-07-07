"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n/use-locale"
import type { NavLink } from "@/types/site-nav"

const linkClass =
  "inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname()
  const locale = useLocale()

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {items.map((link) => {
        const href = link.href ? `/${locale}${link.href}` : `/${locale}`
        const isActive = link.href
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === `/${locale}` || pathname === `/${locale}/`

        return (
          <Link key={link.label} href={href} className={cn(linkClass, isActive && "bg-accent/50")}>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function MainNav({ items }: { items?: NavLink[] }) {
  if (items && items.length > 0) {
    return <NavLinks items={items.map((i) => ({ href: i.href, label: i.label }))} />
  }

  return (
    <NavLinks
      items={[
        { href: "", label: "Home" },
        { href: "/pricing", label: "Pricing" },
        { href: "/legal/privacy", label: "Privacy" },
        { href: "/legal/terms", label: "Terms" },
      ]}
    />
  )
}
