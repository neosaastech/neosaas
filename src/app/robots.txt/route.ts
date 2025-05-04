export async function GET() {
  const robotsTxt = `
User-agent: *
Allow: /

Sitemap: https://www.neosaas.tech/sitemap.xml
`.trim();

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
