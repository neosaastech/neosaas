"use client"

/**
 * "feature-grid" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 * Extracted from the previously static app/(public)/features/page.tsx.
 */

import * as LucideIcons from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface FeatureGridItem {
  icon: string
  title: string
  description: string
  bullets: string[]
}

export interface FeatureGridLayerProps {
  items: FeatureGridItem[]
}

export function FeatureGridLayer({ items }: FeatureGridLayerProps) {
  return (
    <div className="mx-auto mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const IconComponent = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[item.icon]
        return (
          <Card key={item.title}>
            <CardHeader>
              {IconComponent && <IconComponent className="h-10 w-10 text-primary mb-4" />}
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
  )
}
