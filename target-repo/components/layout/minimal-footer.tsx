"use client"

import { usePlatformConfig } from "@/contexts/platform-config-context"

export function MinimalFooter() {
  const { siteName } = usePlatformConfig()

  return (
    <footer className="border-t bg-background">
      <div className="container flex justify-center py-4">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
      </div>
    </footer>
  )
}
