"use client"

/**
 * "feature-grid" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 * Extracted from the previously static app/(public)/features/page.tsx.
 */

import { Icon } from "@/components/ui/icon"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eyebrow } from "@/components/ui/eyebrow"

export interface FeatureGridItem {
  icon: string
  iconSize?: "sm" | "md" | "lg"
  title: string
  description: string
  bullets: string[]
}

export interface FeatureGridLayerProps {
  eyebrow?: string
  title?: string
  items: FeatureGridItem[]
}

const ICON_SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-14 w-14",
}

export function FeatureGridLayer({ eyebrow, title, items }: FeatureGridLayerProps) {
  return (
    // Charles (2026-07-15): "les modules sans margin sur les côtés" — every
    // sibling layer (pricing-table, testimonials, blog-list...) constrains
    // its own content width via mx-auto max-w-*; this one was missing the
    // max-w-* half of that pattern entirely, so it stretched edge-to-edge
    // inside its parent full-bleed <section> (block-wrapper.tsx).
    <div className="mx-auto mt-16 max-w-5xl">
      {eyebrow && <Eyebrow className="mb-2 text-center">{eyebrow}</Eyebrow>}
      {title && <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          return (
            <Card key={item.title}>
              <CardHeader>
                {item.icon && (
                  <Icon name={item.icon} className={`${ICON_SIZE_CLASSES[item.iconSize ?? "md"]} text-primary mb-4`} />
                )}
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
