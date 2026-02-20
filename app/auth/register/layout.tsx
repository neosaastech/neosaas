import type React from "react"
import { redirect } from "next/navigation"
import { getPlatformConfig } from "@/lib/config"

export default async function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const config = await getPlatformConfig()

  // In maintenance mode, disable registration
  if (config.maintenanceMode) {
    redirect("/maintenance")
  }

  return <>{children}</>
}
