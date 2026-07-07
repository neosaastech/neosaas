/**
 * "article-header" layer (Pilier C — Calques de page). Registered in
 * lib/layers/registry.ts. The one block whose content is never typed by an
 * editor — title/image/author/date come from the BlogPost it belongs to,
 * resolved at sync time (payload-cms's sync/targets/neosaas-app.ts
 * SyncContext), not stored on the block itself. Lets an editor place the
 * article's own header anywhere in its layout instead of the fixed position
 * it had before this field existed (see BlogPostPage's hasCustomHeader check).
 */
export interface ArticleHeaderLayerProps {
  title?: string
  imageUrl?: string
  authorName?: string
  publishedAt?: string
}

export function ArticleHeaderLayer({ title, imageUrl, authorName, publishedAt }: ArticleHeaderLayerProps) {
  return (
    <div>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="mb-8 aspect-video w-full rounded-xl object-cover" />
      )}
      {title && <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>}
      {(authorName || publishedAt) && (
        <p className="mt-2 text-sm text-muted-foreground">
          {authorName && `Par ${authorName}`}
          {authorName && publishedAt && " · "}
          {publishedAt && new Date(publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
    </div>
  )
}
