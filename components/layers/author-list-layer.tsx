import { eq } from "drizzle-orm"
import { db } from "@/db"
import { authors } from "@/db/schema"
import { Eyebrow } from "@/components/ui/eyebrow"
import { AuthorGridCard } from "@/components/blog/author-grid-card"
import { resolveAuthorProfile } from "./author-card-layer"

export interface AuthorListLayerProps {
  eyebrow?: string
  title?: string
  subtitle?: string
  limit?: number
}

/**
 * "author-list" layer (Pilier C — Calques de page) — the "liste des
 * auteurs" module Charles referenced (it didn't actually exist yet, unlike
 * the single-author "author-card"). Same query-at-render pattern as
 * BlogListLayer: active authors, current data, not a snapshot. Reuses
 * resolveAuthorProfile (author-card-layer.tsx) per author so the same
 * per-field visibility rule applies here as on the single author-card.
 */
export async function AuthorListLayer({ eyebrow, title, subtitle, limit }: AuthorListLayerProps) {
  const activeAuthors = await db.query.authors.findMany({
    where: eq(authors.isActive, true),
    orderBy: (a, { asc }) => [asc(a.name)],
    limit: limit ?? 24,
  })

  const resolved = await Promise.all(
    activeAuthors.map(async (a) => {
      const profile = await resolveAuthorProfile(a.id)
      return profile ? { id: a.id, ...profile } : null
    }),
  )
  const profiles = resolved.filter((p): p is NonNullable<typeof p> => p !== null)

  if (profiles.length === 0) return null

  return (
    <div className="mx-auto mt-16 max-w-5xl">
      {eyebrow && <Eyebrow className="mb-2 text-center">{eyebrow}</Eyebrow>}
      {title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
      {subtitle && (
        <div className="mt-3 text-center text-muted-foreground [&_p]:m-0" dangerouslySetInnerHTML={{ __html: subtitle }} />
      )}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {profiles.map((profile) => (
          <AuthorGridCard key={profile.id} {...profile} />
        ))}
      </div>
    </div>
  )
}
