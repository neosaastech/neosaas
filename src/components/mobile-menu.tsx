"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

export function MobileMenu() {
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
            <span className="text-foreground">Neo</span>
            <span className="text-[#CD7F32]">SaaS</span>
          </div>
        </div>
        <div className="flex flex-col gap-6 px-2 py-6">
          <nav className="flex flex-col space-y-4">
            <Link href="/" className="text-lg font-medium hover:text-[#CD7F32]">
              Home
            </Link>
            <Link href="/features" className="text-lg font-medium hover:text-[#CD7F32]">
              Features
            </Link>
            <Link href="/pricing" className="text-lg font-medium hover:text-[#CD7F32]">
              Pricing
            </Link>
            <Link href="/demo" className="text-lg font-medium hover:text-[#CD7F32]">
              Demo
            </Link>
            <Link href="/docs" className="text-lg font-medium hover:text-[#CD7F32]">
              Docs
            </Link>
            <Link href="/appearance" className="text-lg font-medium hover:text-[#CD7F32]">
              Appearance
            </Link>
            <Link href="/brand" className="text-lg font-medium hover:text-[#CD7F32]">
              Brand
            </Link>
          </nav>

          <div className="flex flex-col gap-2 mt-4">
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                Login
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="w-full bg-[#CD7F32] hover:bg-[#B26B27] text-white border-none">Sign Up</Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
