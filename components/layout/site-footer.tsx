"use client"

import Link from "next/link"
import { usePlatformConfig } from "@/contexts/platform-config-context"

export function SiteFooter() {
  const { siteName } = usePlatformConfig()

  return (
    <footer className="border-t bg-[#1A1A1A] text-white">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-3 text-center md:text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <div className="font-bold text-xl tracking-tight">
                <span className="text-white">{siteName.substring(0, 3)}</span>
                <span className="text-brand">{siteName.substring(3)}</span>
              </div>
            </div>
            <p className="text-sm text-white/70">
              All-in-one platform with everything you need to launch, grow, and manage your SaaS business.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-4 text-brand">Product</h3>
            <ul className="space-y-2 flex flex-col items-center md:items-start">
              <li>
                <Link href="/pricing" className="text-sm text-white/70 hover:text-white">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4 text-brand">Company</h3>
            <ul className="space-y-2 flex flex-col items-center md:items-start">
              <li>
                <Link href="/legacy/about" className="text-sm text-white/70 hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/legacy/contact" className="text-sm text-white/70 hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/legacy/affiliate" className="text-sm text-white/70 hover:text-white">
                  Affiliates
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8">
          <p className="text-sm text-white/70 text-center">
            &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
