"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n/use-locale"
import type { NavLink } from "@/types/site-nav"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

const linkClass =
  "inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"

function NavLinks({ items }: { items: NavLink[] }) {
  const pathname = usePathname()
  const locale = useLocale()

  return (
    <NavigationMenu viewport={false} className="hidden md:flex" aria-label="Main">
      <NavigationMenuList className="gap-1">
        {items.map((link) => {
          const href = link.href ? `/${locale}${link.href}` : `/${locale}`
          const isActive = link.href
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === `/${locale}` || pathname === `/${locale}/`

          // Charles (2026-07-15): nav items with sub-links ("Sub-link
          // (dropdown menu)" in the admin editor) synced fine but were
          // silently dropped here — only top-level label/href were ever
          // rendered, `children` never read at all.
          if (link.children && link.children.length > 0) {
            return (
              <NavigationMenuItem key={link.label}>
                <NavigationMenuTrigger className={cn("bg-transparent", isActive && "bg-accent/50")}>
                  {link.label}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-56 gap-1 p-1">
                    {link.children.map((child) => {
                      const childHref = child.href ? `/${locale}${child.href}` : `/${locale}`
                      return (
                        <li key={child.label}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={childHref}
                              className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              {child.label}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      )
                    })}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )
          }

          return (
            <NavigationMenuItem key={link.label}>
              <NavigationMenuLink asChild className={cn(linkClass, isActive && "bg-accent/50")}>
                <Link href={href}>{link.label}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export function MainNav({ items }: { items?: NavLink[] }) {
  if (items && items.length > 0) {
    return <NavLinks items={items} />
  }

  return (
    <NavLinks
      items={[
        { href: "", label: "Home" },
        { href: "/pricing", label: "Pricing" },
        { href: "/documentation", label: "Documentation" },
        { href: "/legal/privacy", label: "Privacy" },
        { href: "/legal/terms", label: "Terms" },
      ]}
    />
  )
}
