import { getPlatformConfig } from "@/lib/config"

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {children}
    </div>
  )
}
