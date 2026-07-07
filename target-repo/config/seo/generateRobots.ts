import { loadNeosaasConfig } from "@/server/loadConfig"

export async function generateRobotsTxt() {
  const config = await loadNeosaasConfig()
  const siteUrl = config.siteUrl || `https://${config.domain}`

  return `
User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`.trim()
}
