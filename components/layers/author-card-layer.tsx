import { eq } from "drizzle-orm"
import { db } from "@/db"
import { authors } from "@/db/schema"
import { AuthorBox } from "@/components/blog/author-box"

export interface AuthorCardLayerProps {
  authorId?: string
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
  const author = await db.query.authors.findFirst({ where: eq(authors.id, authorId) })
  if (!author || !author.isActive) return null
  return <AuthorBox name={author.name} bio={author.bio} avatarUrl={author.avatarUrl} />
}
