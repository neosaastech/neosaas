export function loadNeosaasConfig() {
  // Configuration basée sur les variables d'environnement
  const config = {
    domain: process.env.NEXT_PUBLIC_DOMAIN || process.env.VERCEL_URL || "localhost:3000",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_DOMAIN || process.env.VERCEL_URL || "localhost:3000"}`,
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || "NeoSaaS",
    siteDescription: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Plateforme SaaS moderne",
  }

  console.log("✅ Configuration chargée avec succès (Status 200 OK)")
  return config
}
