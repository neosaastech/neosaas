"use client"

import type React from "react"
import { useState } from "react"
import { PrivateSidebar } from "@/components/layout/private-dashboard/sidebar"
import { PrivateHeader } from "@/components/layout/private-dashboard/header"
import { UserProvider } from "@/lib/contexts/user-context"
import { sessionUserFromAuth } from "@/lib/auth/session-user"
import { PlatformConfigProvider, type PlatformConfig } from "@/contexts/platform-config-context"
import { CartProvider } from "@/contexts/cart-context"
import { TosModal } from "@/components/legal/tos-modal"

interface User {
  userId: string
  email: string
  roles?: string[]
  permissions?: string[]
}

interface PrivateLayoutClientProps {
  children: React.ReactNode
  user: User
  platformConfig: PlatformConfig
  alerts?: React.ReactNode
}

export function PrivateLayoutClient({ children, user, platformConfig, alerts }: PrivateLayoutClientProps) {
  // Charles (2026-07-11): "on a pas de menu mobile dans l'espace admin de
  // neosaas... le menu mobile existe quelque part assurément mais doit être
  // réactivé." PrivateSidebar already had the full mobile drawer
  // implementation (isOpen/onClose props, translate-x transform, backdrop,
  // close button) — it was just never given an isOpen state or a way to
  // open it, so it sat permanently off-screen below the md breakpoint.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <PlatformConfigProvider config={platformConfig}>
      <UserProvider initialUser={sessionUserFromAuth(user)}>
        <CartProvider>
          <div className="flex h-screen overflow-hidden bg-muted/30">
            <PrivateSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col">
              <PrivateHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
              <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
                {alerts}
                <div className="flex-1">{children}</div>
                {platformConfig.adminFooterCopyright && (
                  <footer className="mt-6 py-4 text-center text-xs text-muted-foreground border-t">
                    {platformConfig.adminFooterCopyright}
                  </footer>
                )}
              </main>
            </div>
          </div>
          <TosModal />
        </CartProvider>
      </UserProvider>
    </PlatformConfigProvider>
  )
}
