"use client"

import type React from "react"
import { PrivateSidebar } from "@/components/layout/private-dashboard/sidebar"
import { PrivateHeader } from "@/components/layout/private-dashboard/header"
import { UserProvider } from "@/lib/contexts/user-context"
import { PlatformConfigProvider, type PlatformConfig } from "@/contexts/platform-config-context"
import { CartProvider } from "@/contexts/cart-context"
import { useState } from "react"
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <PlatformConfigProvider config={platformConfig}>
      <UserProvider>
        <CartProvider>
          <div className="flex h-screen">
            <PrivateSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex flex-1 flex-col">
              <PrivateHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
              <main className="flex-1 overflow-y-auto bg-muted/30 p-6 flex flex-col">
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
