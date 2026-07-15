"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { type JWTPayload } from "@/lib/auth"

/**
 * The auth-aware Login/Sign Up (logged out) or Dashboard (logged in) button
 * pair — previously inlined separately in site-header.tsx and
 * mobile-menu.tsx, always shown unconditionally with no way to turn it off
 * from the admin. Extracted so it can be gated by the Header doc's
 * `showAuthButtons` toggle (same on/off pattern as showThemeSwitch/
 * showLocaleSwitcher/showSocialLinks) instead of being permanently hardcoded.
 */
export function AuthNavButtons({
  user,
  variant = "desktop",
  onNavigate,
}: {
  user?: JWTPayload | null
  variant?: "desktop" | "mobile"
  onNavigate?: () => void
}) {
  if (variant === "mobile") {
    return user ? (
      <Link href="/dashboard" onClick={onNavigate}>
        <Button className="w-full gap-2">
          <Lock className="h-4 w-4" />
          Dashboard
        </Button>
      </Link>
    ) : (
      <>
        <Link href="/auth/login" onClick={onNavigate}>
          <Button variant="outline" className="w-full">
            Login
          </Button>
        </Link>
        <Link href="/auth/register" onClick={onNavigate}>
          <Button className="w-full bg-brand hover:bg-[#B26B27] text-white border-none">Sign Up</Button>
        </Link>
      </>
    )
  }

  return user ? (
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
  )
}
