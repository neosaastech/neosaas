import Link from "next/link"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { categories } from "@/db/schema"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Eyebrow } from "@/components/ui/eyebrow"

export interface CategoryListLayerProps {
  eyebrow?: string
  title?: string
  subtitle?: string
  limit?: number
}

/**
 * "category-list" layer (companion to "blog-list" — Charles, 2026-07-12:
 * "un module de liste de catégories concernées"). Same live-query pattern
 * as BlogListLayer: queries db/schema.ts's categories table directly at
 * render time rather than a snapshot, so it always reflects the current
 * category set.
 */
export async function CategoryListLayer({ eyebrow, title, subtitle, limit }: CategoryListLayerProps) {
  const items = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
    orderBy: [desc(categories.createdAt)],
    limit: limit ?? 12,
  })

  if (items.length === 0) return null

  return (
    <div className="mx-auto mt-16 max-w-5xl">
      {eyebrow && <Eyebrow className="mb-2 text-center">{eyebrow}</Eyebrow>}
      {title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
      {subtitle && (
        <div className="mt-3 text-center text-muted-foreground [&_p]:m-0" dangerouslySetInnerHTML={{ __html: subtitle }} />
      )}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((category) => (
          <Link key={category.slug} href={category.path}>
            <Card className="h-full overflow-hidden py-0">
              {category.headerImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={category.headerImageUrl} alt="" className="aspect-video w-full object-cover" />
              )}
              <CardHeader className="py-6">
                <CardTitle>{category.name}</CardTitle>
                {category.description && (
                  <CardDescription className="[&_p]:m-0" dangerouslySetInnerHTML={{ __html: category.description }} />
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
