import type React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

import { Inter, Geist_Mono as V0_Font_Geist_Mono } from 'next/font/google'

// Initialize fonts
const _geistMono = V0_Font_Geist_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })

const inter = Inter({ subsets: ["latin"] })

const neosaasConfig = {
  appName: "NeoSaaS",
  domain: "neosaas.tech",
  siteUrl: "https://neosaas.tech",
  features: {
    enableAnalytics: true,
    enableEmailNotifications: true,
    enableMultitenancy: true,
    enableStorage: true,
  },
  analytics: {
    plausibleDomain: "neosaas.tech",
  },
  seoDefaults: {
    title: "NeoSaaS - The Complete SaaS Platform for Modern Businesses",
    description:
      "NeoSaaS provides all the tools you need to build, launch, and scale your SaaS business. Start your journey today.",
    keywords: "saas, platform, startup, tech, business, software, cloud",
    image: "https://neosaas.tech/og-image.png",
  },
  email: {
    provider: "resend",
    fromEmail: "no-reply@neosaas.tech",
    fromName: "NeoSaaS Team",
  },
  storage: {
    provider: "s3",
    region: "us-east-1",
    buckets: ["neosaas-assets", "neosaas-uploads", "neosaas-backups"],
  },
  payments: {
    providers: ["stripe", "paypal"],
    defaultProvider: "stripe",
    currency: "USD",
  },
}

const seo = neosaasConfig.seoDefaults ?? {}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const title = seo.title || "NeoSaaS"
  const description = seo.description || "A modern SaaS platform."
  const keywords = seo.keywords || "saas, platform, startup, tech"
  const image = seo.image || `https://${neosaasConfig.domain}/og-image.png`
  const domain = `https://${neosaasConfig.domain}`

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Balises HTML standards */}
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content={neosaasConfig.appName} />
        <meta name="generator" content="v0.dev" />
        <link rel="canonical" href={domain} />

        {/* OpenGraph Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={domain} />
        <meta property="og:image" content={image} />
        <meta property="og:site_name" content={neosaasConfig.appName} />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        <meta name="twitter:site" content={`@${neosaasConfig.appName}`} />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />

        {/* Script Analytics si activé */}
        {neosaasConfig.features?.enableAnalytics && (
          <script
            async
            defer
            data-domain={neosaasConfig.analytics?.plausibleDomain}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.app'
    };
