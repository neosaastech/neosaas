/**
 * "content" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 * Freeform rich text synced from Payload as plain HTML (same convertLexicalToHTML
 * path already used for blog post bodies) — same Tailwind arbitrary-variant styling
 * as app/[locale]/(public)/blog/[slug]/page.tsx, not a separate `prose` dependency.
 */
export interface ContentLayerProps {
  bodyHtml: string
}

export function ContentLayer({ bodyHtml }: ContentLayerProps) {
  return (
    <div
      className="mx-auto max-w-3xl space-y-4 [&_a]:text-primary [&_a]:underline [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-6 [&_ul]:list-disc [&_ol]:list-decimal"
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  )
}
