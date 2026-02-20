import type React from "react"
import Script from "next/script"

import { ThemeProvider } from "@/components/common/theme-provider"
import { DynamicThemeProvider } from "@/components/common/dynamic-theme-provider"
import { BackToTop } from "@/components/common/back-to-top"
import { Toaster } from "@/components/ui/sonner"
import "@/styles/globals.css"

import { GeistSans } from 'geist/font/sans'
import { getPlatformConfig } from "@/lib/config"
import { getThemeConfig } from "@/app/actions/theme-config"
import { generateThemeCSS } from "@/lib/theme/generate-css"

export async function generateMetadata() {
  try {
    const config = await getPlatformConfig()
    const seo = config.seoSettings || {}

    return {
      title: {
        default: config.siteName,
        template: seo.titleTemplate || `%s | ${config.siteName}`,
      },
      description: seo.description || `${config.siteName} provides all the tools you need to build, launch, and scale your SaaS business.`,
      generator: 'v0.app',
      icons: config.logo ? [{ rel: "icon", url: config.logo }] : [{ rel: "icon", url: "/favicon.ico" }],
      openGraph: {
        title: seo.ogTitle || config.siteName,
        description: seo.ogDescription || seo.description,
        images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
        url: seo.baseUrl,
        siteName: config.siteName,
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.ogTitle || config.siteName,
        description: seo.ogDescription || seo.description,
        images: seo.ogImage ? [seo.ogImage] : undefined,
      }
    }
  } catch (error) {
    // Fallback metadata if config fails to load
    return {
      title: {
        default: 'NeoSaaS',
        template: '%s | NeoSaaS',
      },
      description: 'NeoSaaS provides all the tools you need to build, launch, and scale your SaaS business.',
      generator: 'v0.app',
    }
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const config = await getPlatformConfig()
  const themeConfig = await getThemeConfig()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {config.customHeaderCode && (
          <div dangerouslySetInnerHTML={{ __html: config.customHeaderCode }} />
        )}
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(themeConfig) }} />
      </head>
      <body className={GeistSans.className}>
        {config.gtmCode && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${config.gtmCode}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <DynamicThemeProvider theme={themeConfig}>
            {children}
            <BackToTop />
            <Toaster />
          </DynamicThemeProvider>
        </ThemeProvider>

        {config.customFooterCode && (
          <div dangerouslySetInnerHTML={{ __html: config.customFooterCode }} />
        )}

        {config.gtmCode && (
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${config.gtmCode}');
            `}
          </Script>
        )}
      </body>
    </html>
  )
}
