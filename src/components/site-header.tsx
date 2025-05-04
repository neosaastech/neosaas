"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { MobileMenu } from "@/components/mobile-menu"

export function SiteHeader() {
  const pathname = usePathname()
  const isDemo = pathname === "/demo"

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            {!isDemo && <MobileMenu />}
            <ThemeToggle />
            <div className="hidden md:flex space-x-1">
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-[#CD7F32] hover:bg-[#B26B27] text-white border-none">
                  Sign Up
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
