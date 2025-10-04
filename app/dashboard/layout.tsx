import type React from "react"
import type { Metadata } from "next/metadata"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardSidebar } from "@/components/dashboard/sidebar"

export const metadata: Metadata = {
  title: "Dashboard - NeoSaaS",
  description: "Super Admin Dashboard for NeoSaaS",
}

export default function DashboardLayout({
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
