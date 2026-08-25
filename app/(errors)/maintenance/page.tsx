import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Wrench, LogIn } from 'lucide-react'
import { getPlatformConfig } from '@/lib/config'
import { SiteNameText } from '@/components/common/site-name-text'

// No client-side state/effects here -- was 'use client' with no reason to
// be, which also meant usePlatformConfig() would only ever see the
// context's hardcoded default (nothing wraps this route group in a
// PlatformConfigProvider), not the real site name. Server Component +
// direct getPlatformConfig() sidesteps that entirely.
export default async function MaintenancePage() {
  const { siteName, siteNameStyle, siteNameHtml } = await getPlatformConfig()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
        <Wrench className="h-12 w-12 text-primary" />
      </div>
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Site en Maintenance
      </h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Nous effectuons actuellement une maintenance programmée.<br />
        Nous serons de retour très bientôt !
      </p>
      <Button asChild size="lg">
        <Link href="/auth/login">
          <LogIn className="mr-2 h-4 w-4" />
          Connexion Admin
        </Link>
      </Button>
      <div className="mt-12 text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} - <SiteNameText siteName={siteName} siteNameStyle={siteNameStyle} siteNameHtml={siteNameHtml} accentClassName="text-primary" />
        </p>
      </div>
    </div>
  )
}
