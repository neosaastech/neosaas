"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

export function MainNav() {
  const pathname = usePathname()

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
                      href="/features"
                    >
                      <div className="mb-2 mt-4 text-lg font-medium">Features</div>
                      <p className="text-sm leading-tight text-muted-foreground">
                        Explore all the powerful features NeoSaaS has to offer.
                      </p>
                    </a>
                  </NavigationMenuLink>
                </li>
                <li>
                  <Link href="/dashboard-exemple/analytics" legacyBehavior passHref>
                    <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      <div className="text-sm font-medium leading-none">Analytics</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Track user behavior and business metrics.
                      </p>
                    </NavigationMenuLink>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard-exemple/users" legacyBehavior passHref>
                    <NavigationMenuLink className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      <div className="text-sm font-medium leading-none">User Management</div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Manage users, roles, and permissions.
                      </p>
                    </NavigationMenuLink>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard-exemple/payments" legacyBehavior passHref>
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
            <Link href="/pricing" legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(
                  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                  pathname === "/pricing" ? "bg-accent/50" : "",
                )}
              >
                Pricing
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href="/brand" legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(
                  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                  pathname === "/brand" ? "bg-accent/50" : "",
                )}
              >
                Brand
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href="/docs" legacyBehavior passHref>
              <NavigationMenuLink
                className={cn(
                  "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                  pathname === "/docs" || pathname.startsWith("/docs/") ? "bg-accent/50" : "",
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
