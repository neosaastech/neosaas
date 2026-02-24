"use client"

import Link from "next/link"
import { usePathname } from 'next/navigation'
import { MainNav } from "@/components/layout/main-nav"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { Button } from "@/components/ui/button"
import { MobileMenu } from "@/components/layout/mobile-menu"
import Image from "next/image"
import { Github, Linkedin, Lock } from 'lucide-react'
import { type JWTPayload } from "@/lib/auth"
import { usePlatformConfig } from "@/contexts/platform-config-context"

interface SiteHeaderProps {
  user?: JWTPayload | null
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const pathname = usePathname()
  const isDemo = pathname === "/demo"
  const { siteName, logo, logoDisplayMode } = usePlatformConfig()

  // Default fallback logo
  const logoSrc = logo || "/images/logo_neolux.jpg"

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            {(logoDisplayMode === 'logo' || logoDisplayMode === 'both') && (
              <Image src={logoSrc} alt={siteName} width={32} height={32} className="rounded" />
            )}
            {(logoDisplayMode === 'text' || logoDisplayMode === 'both') && (
              <span className="font-bold text-lg">
                <span className="text-foreground">{siteName.substring(0, 3)}</span>
                <span className="text-brand">{siteName.substring(3)}</span>
              </span>
            )}
          </Link>
        </div>
        <MainNav />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            {!isDemo && <MobileMenu user={user} />}
            <div className="hidden md:flex items-center space-x-2 mr-2">
              <Link
                href="https://www.linkedin.com/company/109552979/admin/dashboard/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link
                href="https://github.com/neosaastech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </Link>
            </div>
            <ThemeToggle />
            <div className="hidden md:flex space-x-1">
              {user ? (
                <Link href="/dashboard">
                  <Button variant="default" size="sm" className="gap-2">
                    <Lock className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm" className="bg-brand hover:bg-[#B26B27] text-white border-none">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
