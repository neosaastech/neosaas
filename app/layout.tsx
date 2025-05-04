import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { loadNeosaasConfig } from "@/server/loadConfig"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

const neosaasConfig = loadNeosaasConfig()
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
        <link rel="icon" href="/favicon.ico" />

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
console.log("✅ Configuration NeoSaaS chargée :", neosaasConfig)

export const metadata = {
      generator: 'v0.dev'
    };
