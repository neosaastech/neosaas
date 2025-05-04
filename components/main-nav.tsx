"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { MobileMenu } from "@/components/mobile-menu"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()

  return (
    <div className="flex md:gap-10">
      <Link href="/" className="hidden items-center space-x-2 md:flex">
        <div className="font-bold text-xl tracking-tight">
          <span className="text-foreground">Neo</span>
          <span className="text-[#CD7F32]">SaaS</span>
        </div>
      </Link>
      <nav className={cn("hidden gap-6 md:flex", className)} {...props}>
        <Link
          href="/"
          className={cn(
            "flex items-center text-lg font-medium transition-colors hover:text-[#CD7F32] sm:text-sm",
            pathname === "/" ? "text-[#CD7F32]" : "text-foreground/60",
          )}
        >
          Home
        </Link>
        <Link
          href="/features"
          className={cn(
            "flex items-center text-lg font-medium transition-colors hover:text-[#CD7F32] sm:text-sm",
            pathname === "/features" ? "text-[#CD7F32]" : "text-foreground/60",
          )}
        >
          Features
        </Link>
        <Link
          href="/pricing"
          className={cn(
            "flex items-center text-lg font-medium transition-colors hover:text-[#CD7F32] sm:text-sm",
            pathname === "/pricing" ? "text-[#CD7F32]" : "text-foreground/60",
          )}
        >
          Pricing
        </Link>
        <Link
          href="/demo"
          className={cn(
            "flex items-center text-lg font-medium transition-colors hover:text-[#CD7F32] sm:text-sm",
            pathname === "/demo" ? "text-[#CD7F32]" : "text-foreground/60",
          )}
        >
          Demo
        </Link>
        <Link
          href="/docs"
          className={cn(
            "flex items-center text-lg font-medium transition-colors hover:text-[#CD7F32] sm:text-sm",
            pathname === "/docs" ? "text-[#CD7F32]" : "text-foreground/60",
          )}
        >
          Docs
        </Link>
        <Link
          href="/appearance"
          className={cn(
            "flex items-center text-lg font-medium transition-colors hover:text-[#CD7F32] sm:text-sm",
            pathname === "/appearance" ? "text-[#CD7F32]" : "text-foreground/60",
          )}
        >
          Appearance
        </Link>
        <Link
          href="/brand"
          className={cn(
            "flex items-center text-lg font-medium transition-colors hover:text-[#CD7F32] sm:text-sm",
            pathname === "/brand" ? "text-[#CD7F32]" : "text-foreground/60",
          )}
        >
          Brand
        </Link>
      </nav>
      <div className="flex md:hidden">
        <MobileMenu />
      </div>
    </div>
  )
}
