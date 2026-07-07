import type { ReactNode } from "react"
import { requireAdmin } from "@/lib/auth/server"

/**
 * Full-viewport shell for Puck — outside the private admin sidebar/header
 * so nested overflow and fixed overlays cannot block the whole app.
 */
export default async function BuilderRootLayout({ children }: { children: ReactNode }) {
  await requireAdmin()

  return <div className="h-svh w-full overflow-hidden bg-background">{children}</div>
}

export const dynamic = "force-dynamic"
