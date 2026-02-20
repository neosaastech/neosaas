import type React from "react"
import type { Metadata } from "next"
import { DashboardHeader } from "@/components/layout/dashboard/header"
import { DashboardSidebar } from "@/components/layout/dashboard/sidebar"
import { getPlatformConfig } from "@/lib/config"

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPlatformConfig()
  return {
    title: `Dashboard Exemple - ${config.siteName}`,
    description: `Example Dashboard for ${config.siteName} - Public Demo`,
  }
}

export default function DashboardExempleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <DashboardSidebar />
      <div className="md:ml-64">
        <DashboardHeader />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
