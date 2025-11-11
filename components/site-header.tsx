"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { MobileMenu } from "@/components/mobile-menu"
import Image from "next/image"
import { Github, Linkedin } from "lucide-react"

export function SiteHeader() {
  const pathname = usePathname()
  const isDemo = pathname === "/demo"

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="w-full max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo_neolux.jpg" alt="NeoSaaS" width={32} height={32} className="rounded" />
            <span className="font-bold text-lg hidden md:inline-block">
              <span className="text-foreground">Neo</span>
              <span className="text-[#CD7F32]">SaaS</span>
            </span>
          </Link>
        </div>

        <div className="hidden md:flex flex-1 justify-center">
          <MainNav />
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-2">
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

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          <div className="hidden md:flex items-center gap-2">
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

          <div className="md:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
