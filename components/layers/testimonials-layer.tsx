/**
 * "testimonials" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 */
import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Eyebrow } from "@/components/ui/eyebrow"

export interface TestimonialItem {
  body: string
  authorName: string
  authorRole?: string
  imageUrl?: string
  rating?: number
  metric?: string
}

export interface TestimonialsLayerProps {
  eyebrow?: string
  title?: string
  items: TestimonialItem[]
}

export function TestimonialsLayer({ eyebrow, title, items }: TestimonialsLayerProps) {
  return (
    <div className="mx-auto mt-16 max-w-5xl">
      {eyebrow && <Eyebrow className="mb-2 text-center">{eyebrow}</Eyebrow>}
      {title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.authorName}>
            <CardContent className="flex flex-col gap-4 pt-6">
              {item.rating && (
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={
                        i < item.rating!
                          ? "h-4 w-4 fill-brand text-brand"
                          : "h-4 w-4 text-muted-foreground/30"
                      }
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">&ldquo;{item.body}&rdquo;</p>
              <div className="flex items-center gap-3">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.authorName} className="h-10 w-10 rounded-full object-cover" />
                )}
                <div>
                  <p className="text-sm font-medium">{item.authorName}</p>
                  {item.authorRole && <p className="text-xs text-muted-foreground">{item.authorRole}</p>}
                </div>
              </div>
              {item.metric && <p className="text-lg font-bold text-primary">{item.metric}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
