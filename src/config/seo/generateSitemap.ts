import { loadNeosaasConfig } from "@/server/loadConfig";

export async function generateSitemapXml() {
  const config = await loadNeosaasConfig();
  const siteUrl = config.siteUrl || `https://${config.domain}`;

  const pages = [
    {
      loc: `${siteUrl}/`,
      changefreq: "weekly",
      priority: 1.0,
      images: [
        {
          loc: `${siteUrl}/public/clean-data-overview.png`,
          title: "Overview Clean Data",
        },
        {
          loc: `${siteUrl}/public/dashboard.jpg`,
          title: "Dashboard Screenshot",
        }
      ]
    },
    {
      loc: `${siteUrl}/features`,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${siteUrl}/pricing`,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${siteUrl}/contact`,
      changefreq: "yearly",
      priority: 0.5,
    }
  ];

  const urls = pages.map(page => {
    const images = page.images
      ? page.images.map(img => `
        <image:image>
          <image:loc>${img.loc}</image:loc>
          <image:title>${img.title}</image:title>
        </image:image>
      `).join("")
      : "";

    return `
    <url>
      <loc>${page.loc}</loc>
      <changefreq>${page.changefreq}</changefreq>
      <priority>${page.priority}</priority>
      ${images}
    </url>
    `.trim();
  }).join("\n");

  return `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
  `.trim();
}
