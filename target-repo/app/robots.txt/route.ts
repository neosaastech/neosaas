import { generateRobotsTxt } from "@/config/seo/generateRobots"

// Was hardcoding "https://www.neosaas.tech/sitemap.xml" — a stale placeholder
// domain, unrelated to whatever domain a given deployment actually serves.
// generateRobotsTxt() already existed and builds the right URL from the
// real site config, it just wasn't wired up here.
export async function GET() {
  const robotsTxt = await generateRobotsTxt()

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
    },
  })
}
