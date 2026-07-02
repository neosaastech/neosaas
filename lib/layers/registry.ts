import { z } from "zod"
import type { ComponentType } from "react"
import { HeroLayer, type HeroLayerProps } from "@/components/layers/hero-layer"
import { FeatureGridLayer, type FeatureGridLayerProps } from "@/components/layers/feature-grid-layer"

/**
 * Single source of truth for page layer types (Pilier G — Normes de nommage & design tokens).
 * A layerType is kebab-case `{domaine}-{élément}` (e.g. `hero`, `pricing-table`,
 * `feature-grid`, `contact-form`, `cta`, `testimonials`). No synonyms: a new layer close to
 * an existing one extends its propsSchema instead of registering a near-duplicate entry.
 *
 * Populated by Pilier C (Calques de page).
 */

export interface LayerDefinition {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>
  propsSchema: z.ZodObject<z.ZodRawShape>
}

const featureGridItemSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
  bullets: z.array(z.string()),
})

export const layerRegistry: Record<string, LayerDefinition> = {
  hero: {
    component: HeroLayer,
    propsSchema: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      ctaLabel: z.string().optional(),
      ctaHref: z.string().optional(),
    }) satisfies z.ZodType<HeroLayerProps>,
  },
  "feature-grid": {
    component: FeatureGridLayer,
    propsSchema: z.object({
      items: z.array(featureGridItemSchema),
    }) satisfies z.ZodType<FeatureGridLayerProps>,
  },
}
