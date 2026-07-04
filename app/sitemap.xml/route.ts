import { generateSitemapXml } from "@/config/seo/generateSitemap"

// Now queries live CMS content (page_layers, blog_posts) — must never be
// statically cached at build time or a page published after the last build
// would stay invisible to search engines until the next deploy.
export const dynamic = "force-dynamic"

export async function GET() {
  const sitemapXml = await generateSitemapXml()

  return new Response(sitemapXml, {
    headers: {
      "Content-Type": "application/xml",
    },
  })
}
