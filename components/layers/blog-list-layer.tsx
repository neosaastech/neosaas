import Link from "next/link"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { blogPosts } from "@/db/schema"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Eyebrow } from "@/components/ui/eyebrow"

export interface BlogListLayerProps {
  eyebrow?: string
  title?: string
  subtitle?: string
  limit?: number
  categorySlug?: string
  locale?: string
}

/**
 * "blog-list" layer (Pilier C — Calques de page). Registered in
 * lib/layers/registry.ts. Unlike every other layer, this one queries
 * db/schema.ts's blogPosts table directly at render time instead of only
 * using its props — it must always reflect the *current* latest posts, not
 * a snapshot frozen when the block was authored in Payload. Props only
 * configure how many posts and which category, not the post data itself.
 */
export async function BlogListLayer({ eyebrow, title, subtitle, limit, categorySlug, locale = "fr" }: BlogListLayerProps) {
  const posts = await db.query.blogPosts.findMany({
    where: and(
      eq(blogPosts.isActive, true),
      eq(blogPosts.locale, locale),
      categorySlug ? eq(blogPosts.categorySlug, categorySlug) : undefined,
    ),
    orderBy: [desc(blogPosts.publishedAt)],
    limit: limit ?? 6,
  })

  if (posts.length === 0) return null

  return (
    <div className="mx-auto mt-16 max-w-5xl">
      {eyebrow && <Eyebrow className="mb-2 text-center">{eyebrow}</Eyebrow>}
      {title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
      {subtitle && (
        <div className="mt-3 text-center text-muted-foreground [&_p]:m-0" dangerouslySetInnerHTML={{ __html: subtitle }} />
      )}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.slug} href={`/${locale}/blog/${post.slug}`}>
            <Card className="h-full overflow-hidden py-0">
              {post.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverImageUrl} alt="" className="aspect-video w-full object-cover" />
              )}
              <CardHeader className="py-6">
                <CardTitle>{post.title}</CardTitle>
                {post.excerpt && <CardDescription>{post.excerpt}</CardDescription>}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
