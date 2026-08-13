import { eq } from "drizzle-orm"
import { db } from "@/db"
import { authors } from "@/db/schema"
import { AuthorBox, type AuthorSocialLink } from "@/components/blog/author-box"

export interface AuthorCardLayerProps {
  authorId?: string
}

/**
 * Resolves a single `authors` row into exactly what AuthorBox should
 * render, applying its per-field visibility toggles — Charles (2026-08-13):
 * "on doit retrouver l'admin et sa description dans sa fiche" but only the
 * fields he's chosen to make public. Phone always comes from the linked
 * site admin (never a separate column on `authors`) — "le plus automatique
 * possible", no independent phone to keep in sync by hand. Shared by
 * AuthorCardLayer here and the upcoming author-list-layer (grid variant),
 * so the visibility rule is enforced in exactly one place.
 */
export async function resolveAuthorProfile(authorId: string) {
  const author = await db.query.authors.findFirst({
    where: eq(authors.id, authorId),
    with: { siteUser: true },
  })
  if (!author || !author.isActive) return null

  return {
    name: author.name,
    bio: author.showBioPublicly ? author.bio : null,
    avatarUrl: author.avatarUrl,
    email: author.showEmailPublicly ? author.siteUser?.email ?? author.email : null,
    phone: author.showPhonePublicly ? author.siteUser?.phone ?? null : null,
    socialLinks: author.showSocialLinksPublicly ? (author.socialLinks as AuthorSocialLink[] | null) : null,
  }
}

/**
 * "author-card" layer (Pilier C — Calques de page) — a ready-to-use Author
 * module an editor can drop on any Page or target via a Module (same
 * Page > Category > PageType > Default scoping as the article-footer
 * module), never a manually-typed name. Charles (2026-08-13): "on doit
 * aussi avoir un module auteur pret à l'emploi pour l'ajouter à volonté sur
 * des pages ou type de page." Resolves `authorId` against the local
 * `authors` table (synced from Payload's Users by syncUserToNeosaasApp) at
 * render time — same reasoning as BlogListLayer querying local db instead
 * of calling Payload live on every page render.
 */
export async function AuthorCardLayer({ authorId }: AuthorCardLayerProps) {
  if (!authorId) return null
  const profile = await resolveAuthorProfile(authorId)
  if (!profile) return null
  return <AuthorBox {...profile} />
}
