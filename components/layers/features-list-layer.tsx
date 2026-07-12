/**
 * "features-list" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 * Split section: checkmark list on one side, optional visual on the other —
 * mirrors neomnia-ui-registry's "Built for Scale" section pattern (neomnia.net).
 */
import { Check } from "lucide-react"
import { Eyebrow } from "@/components/ui/eyebrow"

export interface FeaturesListItem {
  title: string
  description: string
}

export interface FeaturesListLayerProps {
  eyebrow?: string
  title?: string
  subtitle?: string
  items: FeaturesListItem[]
  imageUrl?: string
}

export function FeaturesListLayer({ eyebrow, title, subtitle, items, imageUrl }: FeaturesListLayerProps) {
  return (
    <div className="mx-auto mt-16 grid gap-10 md:grid-cols-2 md:items-center">
      <div>
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        {title && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
        {subtitle && (
          <div
            className="mt-3 text-muted-foreground [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: subtitle }}
          />
        )}
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.title} className="flex gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={title ?? ""} className="w-full rounded-lg object-cover" />
      )}
    </div>
  )
}
