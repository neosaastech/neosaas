import Link from "next/link"

/** Sticky banner shown while Next.js Draft Mode (Payload Live Preview) is active. */
export function PreviewBanner() {
  return (
    <div className="sticky top-0 z-60 border-b border-amber-500/30 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      Mode aperçu — brouillon non publié.{" "}
      <Link href="/api/preview/disable" className="underline underline-offset-2 hover:text-amber-900">
        Quitter l&apos;aperçu
      </Link>
    </div>
  )
}
