// VERCEL_URL is the per-deployment hostname (changes on every deploy, e.g.
// neosaas-6c2wqje3t-neomnia-studio.vercel.app) — never the stable production
// domain. Falling back to it made sitemap.xml/robots.txt advertise a URL
// that's dead the moment the next deploy runs. On Vercel (process.env.VERCEL
// is always "1"), fall back to the known stable alias instead; off Vercel
// (local dev) keep falling back to localhost. NEXT_PUBLIC_DOMAIN /
// NEXT_PUBLIC_SITE_URL still take priority once set on the Vercel project.
const STABLE_PRODUCTION_DOMAIN = "neosaas-app.vercel.app"
const FALLBACK_DOMAIN = process.env.VERCEL ? STABLE_PRODUCTION_DOMAIN : "localhost:3000"

export function loadNeosaasConfig() {
  // Configuration basée sur les variables d'environnement
  const config = {
    domain: process.env.NEXT_PUBLIC_DOMAIN || FALLBACK_DOMAIN,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_DOMAIN || FALLBACK_DOMAIN}`,
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || "NeoSaaS",
    siteDescription: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Plateforme SaaS moderne",
  }

  console.log("✅ Configuration chargée avec succès (Status 200 OK)")
  return config
}
