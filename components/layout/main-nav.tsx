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

/**
 * Renders the tenant's own nav config (Payload's Header collection, synced
 * into platform_config) when one has been set — a flat list with optional
 * dropdown children, simpler than the hardcoded mega-menu below by design,
 * since an admin-authored config can't know about this boilerplate's own
 * demo sub-pages the way the hardcoded fallback does.
 */
function ConfiguredNav({ items }: { items: NavLink[] }) {
  const pathname = usePathname()
  const locale = useLocale()

  return (
    <div className="hidden md:flex">
      <NavigationMenu>
        <NavigationMenuList>
          {items.map((item) => (
            <NavigationMenuItem key={item.href}>
              {item.children && item.children.length > 0 ? (
                <>
                  <NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-1 p-4 md:w-[280px]">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link href={`/${locale}${child.href}`} legacyBehavior passHref>
                            <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground">
                              {child.label}
                            </NavigationMenuLink>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </>
              ) : (
                <Link href={`/${locale}${item.href}`} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                      pathname === `/${locale}${item.href}` ? "bg-accent/50" : "",
                    )}
                  >
                    {item.label}
                  </NavigationMenuLink>
                </Link>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

export function MainNav({ items }: { items?: NavLink[] }) {
  const pathname = usePathname()
  const locale = useLocale()

  if (items && items.length > 0) {
    return <ConfiguredNav items={items} />
  }

  return (
    <div className="hidden md:flex">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Features</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                <li className="row-span-3">
                  <NavigationMenuLink asChild>
                    <a
                      className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                      href={`/${locale}/features`}
                    >
                      <div className="mb-2 mt-4 text-lg font-medium">Features</div>
                      <p className="text-sm leading-tight text-muted-foreground">
                        Explore all the powerful features NeoSaaS has to offer.
                      </p>
                    </a>
                  </NavigationMenuLink>
                </li>
                <li>
                  <Link href={`/${locale}/dashboard-exemple/analytics`} legacyBehavior passHref>
                    <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      <div className="text-sm font-medium leading-none">Analytics</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Track user behavior and business metrics.
                      </p>
                    </NavigationMenuLink>
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/dashboard-exemple/users`} legacyBehavior passHref>
                    <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      <div className="text-sm font-medium leading-none">User Management</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Manage users, roles, and permissions.
                      </p>
                    </NavigationMenuLink>
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/dashboard-exemple/payments`} legacyBehavior passHref>
                    <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      <div className="text-sm font-medium leading-none">Payments</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Manage subscriptions and billing.
                      </p>
                    </NavigationMenuLink>
                  </Link>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href={`/${locale}/pricing`} legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(
                  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                  pathname === `/${locale}/pricing` ? "bg-accent/50" : "",
                )}
              >
                Pricing
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href={`/${locale}/brand`} legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(
                  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                  pathname === `/${locale}/brand` ? "bg-accent/50" : "",
                )}
              >
                Brand
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href={`/${locale}/docs`} legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(
                  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                  pathname === `/${locale}/docs` || pathname.startsWith(`/${locale}/docs/`) ? "bg-accent/50" : "",
                )}
              >
                Documentation
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}
