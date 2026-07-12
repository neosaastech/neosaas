import { generateRobotsTxt } from "@/config/seo/generateRobots"

// Was hardcoding "https://www.neosaas.tech/sitemap.xml" — a stale placeholder
// domain, unrelated to whatever domain a given deployment actually serves.
// generateRobotsTxt() already existed and builds the right URL from the
// real site config, it just wasn't wired up here.
//
// Now also reads platform_config's admin-editable seo_settings.robotsTxt
// (2026-07-13) — must never be statically cached or an admin's edit
// wouldn't show up until the next deploy, same reasoning as sitemap.xml.
export const dynamic = "force-dynamic"

export async function GET() {
  const robotsTxt = await generateRobotsTxt()

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
    },
  })
}
