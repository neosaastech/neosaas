"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Lock } from "lucide-react"
import { type JWTPayload } from "@/lib/auth"
import { usePlatformConfig } from "@/contexts/platform-config-context"

interface MobileMenuProps {
  user?: JWTPayload | null
}

export function MobileMenu({ user }: MobileMenuProps) {
  const { siteName } = usePlatformConfig()

  return (
    <Sheet>
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
            <Link href="/" className="text-lg font-medium hover:text-brand">
              Home
            </Link>
            <Link href="/pricing" className="text-lg font-medium hover:text-brand">
              Pricing
            </Link>
            <Link href="/demo" className="text-lg font-medium hover:text-brand">
              Demo
            </Link>
            <Link href="/docs" className="text-lg font-medium hover:text-brand">
              Docs
            </Link>
            <Link href="/appearance" className="text-lg font-medium hover:text-brand">
              Appearance
            </Link>
          </nav>

          <div className="flex flex-col gap-2 mt-4">
            {user ? (
              <Link href="/dashboard">
                <Button className="w-full gap-2">
                  <Lock className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="w-full bg-brand hover:bg-[#B26B27] text-white border-none">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
