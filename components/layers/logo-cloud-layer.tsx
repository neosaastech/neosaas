/**
 * "logo-cloud" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 * Grid of partner/technology logos — mirrors neomnia-ui-registry's "Built with
 * Modern Technologies" section pattern (neomnia.net). Each item is either an
 * uploaded image or raw inline SVG markup (no image asset available).
 */
import { Eyebrow } from "@/components/ui/eyebrow"

export interface LogoCloudItem {
  name: string
  imageUrl?: string
  markup?: string
}

export interface LogoCloudLayerProps {
  eyebrow?: string
  title?: string
  subtitle?: string
  items: LogoCloudItem[]
}

export function LogoCloudLayer({ eyebrow, title, subtitle, items }: LogoCloudLayerProps) {
  return (
    <div className="mx-auto mt-16 max-w-4xl">
      {eyebrow && <Eyebrow className="mb-2 text-center">{eyebrow}</Eyebrow>}
      {title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
      {subtitle && (
        <div
          className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground [&_a]:text-primary [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: subtitle }}
        />
      )}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {items.map((item) =>
          item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={item.name} src={item.imageUrl} alt={item.name} className="h-8 w-auto object-contain grayscale" />
          ) : item.markup ? (
            <span
              key={item.name}
              title={item.name}
              className="h-8 w-auto text-muted-foreground [&_svg]:h-8 [&_svg]:w-auto"
              dangerouslySetInnerHTML={{ __html: item.markup }}
            />
          ) : (
            <span key={item.name} className="text-sm font-medium text-muted-foreground">
              {item.name}
            </span>
          ),
        )}
      </div>
    </div>
  )
}
