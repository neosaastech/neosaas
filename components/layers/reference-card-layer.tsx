/**
 * "reference" layer (Pilier C — Calques de page). Registered in
 * lib/layers/registry.ts. Points at an arbitrary *other* item (unlike
 * 'article-header', which pulls from the item this layout belongs to) —
 * resolved to a plain title/excerpt/image/href at sync time
 * (payload-cms's sync/targets/neosaas-app.ts 'reference' case).
 */
import Link from "next/link"

export interface ReferenceCardLayerProps {
  title?: string
  excerpt?: string
  imageUrl?: string
  href?: string
}

export function ReferenceCardLayer({ title, excerpt, imageUrl, href }: ReferenceCardLayerProps) {
  if (!title) return null

  const content = (
    <div className="overflow-hidden rounded-xl border">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="aspect-video w-full object-cover" />
      )}
      <div className="p-6">
        <h3 className="font-semibold">{title}</h3>
        {excerpt && <p className="mt-2 text-sm text-muted-foreground">{excerpt}</p>}
      </div>
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
