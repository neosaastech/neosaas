/**
 * Renders a single schema.org JSON-LD block. `data` must already be a
 * plain, serializable object (build it with lib/seo/structured-data.ts's
 * helpers) — this component only stringifies and injects it, no shaping.
 * Safe against XSS the usual dangerouslySetInnerHTML way: JSON.stringify
 * escapes quotes/backslashes, and none of this ever echoes raw HTML.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
