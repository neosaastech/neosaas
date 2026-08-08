// NEXT_PUBLIC_DOMAIN / NEXT_PUBLIC_SITE_URL are rarely set explicitly on any
// given deployment of this app — NEXT_PUBLIC_APP_URL is the one URL var this
// codebase already sets consistently everywhere else (auth, OAuth callbacks,
// Stripe, appointment emails) regardless of hosting target (Vercel, Dokploy,
// self-hosted...). Falling back to a hardcoded Vercel-only domain (or worse,
// "localhost:3000") made sitemap.xml/robots.txt advertise a dead URL on any
// site not hosted on that specific Vercel project — confirmed live on a
// Dokploy-hosted clone site, where process.env.VERCEL is never set either.
const FALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export function loadNeosaasConfig() {
  // Configuration basée sur les variables d'environnement
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_URL
  const config = {
    domain: process.env.NEXT_PUBLIC_DOMAIN || siteUrl.replace(/^https?:\/\//, ""),
    siteUrl,
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || "NeoSaaS",
    siteDescription: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Plateforme SaaS moderne",
  }

  return config
}
