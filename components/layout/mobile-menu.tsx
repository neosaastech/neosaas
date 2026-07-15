"use client"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { type JWTPayload } from "@/lib/auth"
import { usePlatformConfig } from "@/contexts/platform-config-context"
import { useLocale } from "@/lib/i18n/use-locale"
import { AuthNavButtons } from "@/components/layout/auth-nav-buttons"
import type { NavLink } from "@/types/site-nav"

const DEFAULT_ITEMS: NavLink[] = [
  { href: "", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
]

interface MobileMenuProps {
  user?: JWTPayload | null
  showAuthButtons?: boolean
  // Charles (2026-07-15): this menu never received the Payload-driven nav at
  // all — it always rendered the same 4 hardcoded links regardless of what
  // was configured (Header's own desktop nav had the opposite, smaller bug:
  // it received items but silently dropped any `children`/sub-links).
  items?: NavLink[]
}

export function MobileMenu({ user, showAuthButtons = true, items }: MobileMenuProps) {
  const { siteName } = usePlatformConfig()
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const navItems = items && items.length > 0 ? items : DEFAULT_ITEMS

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[75vw] sm:max-w-sm">
        <div className="flex items-center mb-8 mt-2">
          <div className="font-bold text-2xl tracking-tight">
            <span className="text-foreground">{siteName.substring(0, 3)}</span>
            <span className="text-brand">{siteName.substring(3)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-6 px-2 py-6">
          <nav className="flex flex-col space-y-4">
            {navItems.map((link) => {
              const href = link.href ? `/${locale}${link.href}` : `/${locale}`
              return (
                <div key={link.label} className="flex flex-col">
                  <Link href={href} className="text-lg font-medium hover:text-brand" onClick={() => setOpen(false)}>
                    {link.label}
                  </Link>
                  {link.children && link.children.length > 0 && (
                    <div className="mt-2 flex flex-col space-y-2 border-l pl-4">
                      {link.children.map((child) => {
                        const childHref = child.href ? `/${locale}${child.href}` : `/${locale}`
                        return (
                          <Link
                            key={child.label}
                            href={childHref}
                            className="text-sm text-muted-foreground hover:text-brand"
                            onClick={() => setOpen(false)}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {showAuthButtons && (
            <div className="flex flex-col gap-2 mt-4">
              <AuthNavButtons user={user} variant="mobile" onNavigate={() => setOpen(false)} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
