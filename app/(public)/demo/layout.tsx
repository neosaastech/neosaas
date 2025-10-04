import type React from "react"
import { DemoSidebar } from "@/components/demo-sidebar"
import { DemoMobileNav } from "@/components/demo-mobile-nav"

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <div className="flex items-center md:hidden">
          <DemoMobileNav />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Dashboard Demo</h2>
          </div>
        </div>
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <DemoSidebar />
        </aside>
        <main className="relative py-6">{children}</main>
      </div>
    </div>
  )
}
