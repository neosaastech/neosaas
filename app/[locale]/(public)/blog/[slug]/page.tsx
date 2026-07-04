import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { db } from "@/db"
import { blogPosts } from "@/db/schema"

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params
  const post = await db.query.blogPosts.findFirst({ where: eq(blogPosts.slug, slug) })

  if (!post || !post.isActive) notFound()

  return (
    <article className="container max-w-3xl py-12 md:py-24">
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="mb-8 aspect-video w-full rounded-xl object-cover" />
      )}
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
      {post.authorName && <p className="mt-2 text-sm text-muted-foreground">Par {post.authorName}</p>}
      <div
        className="mt-8 space-y-4 [&_a]:text-primary [&_a]:underline [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-6 [&_ul]:list-disc [&_ol]:list-decimal"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
    </article>
  )
}
