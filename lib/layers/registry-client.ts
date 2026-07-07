import { z } from "zod"
import type { ComponentType } from "react"
import { HeroLayer, type HeroLayerProps } from "@/components/layers/hero-layer"
import { FeatureGridLayer, type FeatureGridLayerProps } from "@/components/layers/feature-grid-layer"
import { PricingTableLayer, type PricingTableLayerProps } from "@/components/layers/pricing-table-layer"
import { TestimonialsLayer, type TestimonialsLayerProps } from "@/components/layers/testimonials-layer"
import { CtaBannerLayer, type CtaBannerLayerProps } from "@/components/layers/cta-banner-layer"
import { WelcomeBannerLayer, type WelcomeBannerLayerProps } from "@/components/layers/welcome-banner-layer"
import { IconShowcaseLayer, type IconShowcaseLayerProps } from "@/components/layers/icon-showcase-layer"
import { FormLayer, type FormLayerProps } from "@/components/layers/form-layer"
import type { BlogListLayerProps } from "@/components/layers/blog-list-layer"
import { ContentLayer, type ContentLayerProps } from "@/components/layers/content-layer"

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

const iconShowcaseItemSchema = z.object({
  icon: z.string(),
  label: z.string(),
  highlighted: z.boolean().optional(),
})

const formFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "textarea", "checkbox"]),
  required: z.boolean().optional(),
})

const NoopLayer = () => null

/**
 * Client-safe registry for admin block editors/previews.
 * It intentionally avoids importing server-only runtime dependencies.
 */
export const clientLayerRegistry: Record<string, LayerDefinition> = {
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
      videoUrl: z.string().optional(),
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
  "welcome-banner": {
    component: WelcomeBannerLayer,
    propsSchema: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      ctaLabel: z.string().optional(),
      ctaHref: z.string().optional(),
    }) satisfies z.ZodType<WelcomeBannerLayerProps>,
  },
  "icon-showcase": {
    component: IconShowcaseLayer,
    propsSchema: z.object({
      items: z.array(iconShowcaseItemSchema).optional(),
      imageUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      overlayIcons: z.boolean().optional(),
    }) satisfies z.ZodType<IconShowcaseLayerProps>,
  },
  form: {
    component: FormLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      name: z.string(),
      items: z.array(formFieldSchema),
      submitLabel: z.string().optional(),
      successMessage: z.string().optional(),
    }) satisfies z.ZodType<FormLayerProps>,
  },
  "blog-list": {
    component: NoopLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      limit: z.number().optional(),
      categorySlug: z.string().optional(),
    }) satisfies z.ZodType<BlogListLayerProps>,
  },
  content: {
    component: ContentLayer,
    propsSchema: z.object({
      bodyHtml: z.string(),
    }) satisfies z.ZodType<ContentLayerProps>,
  },
}