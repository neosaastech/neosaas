import { loadNeosaasConfig } from "@/server/loadConfig"
import { getPlatformConfig } from "@/lib/config"

// Charles (2026-07-13): "dans paramètre on doit avoir un espace dédié à la
// rédaction du /robots.txt" — admin/settings' SEO Metadata tab now has a
// robots.txt textarea (platform_config's seo_settings.robotsTxt), served
// verbatim when set. Empty (the default) falls back to the original
// Allow-all + Sitemap template below.
export async function generateRobotsTxt() {
  const [config, platformConfig] = await Promise.all([loadNeosaasConfig(), getPlatformConfig()])
  const siteUrl = config.siteUrl || `https://${config.domain}`

  const custom = (platformConfig.seoSettings?.robotsTxt as string | undefined)?.trim()
  if (custom) return custom

  return `
User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`.trim()
}
