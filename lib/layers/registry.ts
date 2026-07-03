import { z } from "zod"
import type { ComponentType } from "react"
import { HeroLayer, type HeroLayerProps } from "@/components/layers/hero-layer"
import { FeatureGridLayer, type FeatureGridLayerProps } from "@/components/layers/feature-grid-layer"
import { PricingTableLayer, type PricingTableLayerProps } from "@/components/layers/pricing-table-layer"
import { TestimonialsLayer, type TestimonialsLayerProps } from "@/components/layers/testimonials-layer"
import { CtaBannerLayer, type CtaBannerLayerProps } from "@/components/layers/cta-banner-layer"

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

const trustPillSchema = z.object({
  icon: z.string(),
  label: z.string(),
})

const pricingTablePlanSchema = z.object({
  name: z.string(),
  price: z.string(),
  period: z.string().optional(),
  bullets: z.array(z.string()),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  highlighted: z.boolean().optional(),
})

const testimonialItemSchema = z.object({
  body: z.string(),
  authorName: z.string(),
  authorRole: z.string().optional(),
  imageUrl: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  metric: z.string().optional(),
})

export const layerRegistry: Record<string, LayerDefinition> = {
  hero: {
    component: HeroLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string(),
      subtitle: z.string().optional(),
      trustPills: z.array(trustPillSchema).optional(),
      ctaLabel: z.string().optional(),
      ctaHref: z.string().optional(),
      secondaryCtaLabel: z.string().optional(),
      secondaryCtaHref: z.string().optional(),
      imageUrl: z.string().optional(),
    }) satisfies z.ZodType<HeroLayerProps>,
  },
  "feature-grid": {
    component: FeatureGridLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      items: z.array(featureGridItemSchema),
    }) satisfies z.ZodType<FeatureGridLayerProps>,
  },
  "pricing-table": {
    component: PricingTableLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      items: z.array(pricingTablePlanSchema),
    }) satisfies z.ZodType<PricingTableLayerProps>,
  },
  testimonials: {
    component: TestimonialsLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      items: z.array(testimonialItemSchema),
    }) satisfies z.ZodType<TestimonialsLayerProps>,
  },
  "cta-banner": {
    component: CtaBannerLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string(),
      subtitle: z.string().optional(),
      ctaLabel: z.string(),
      ctaHref: z.string(),
    }) satisfies z.ZodType<CtaBannerLayerProps>,
  },
}
