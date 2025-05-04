import { generateSitemapXml } from "@/config/seo/generateSitemap";

export async function GET() {
  const sitemapXml = await generateSitemapXml();

  return new Response(sitemapXml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
