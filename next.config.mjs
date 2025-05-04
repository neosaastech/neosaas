/** @type {import('next').NextConfig} */
import { config } from 'dotenv'

// Charger les variables d'environnement
config({ path: '.env.server' })
config({ path: '.env.client' })

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: { enabled: true },
  }, // 👈 ajoute cette virgule ici
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  },
}

export default nextConfig
