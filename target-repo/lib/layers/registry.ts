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
import { BlogListLayer, type BlogListLayerProps } from "@/components/layers/blog-list-layer"
import { ContentLayer, type ContentLayerProps } from "@/components/layers/content-layer"
import { ColumnsLayer, type ColumnsLayerProps } from "@/components/layers/columns-layer"
import { ArticleHeaderLayer, type ArticleHeaderLayerProps } from "@/components/layers/article-header-layer"
import { ReferenceCardLayer, type ReferenceCardLayerProps } from "@/components/layers/reference-card-layer"
import { GrapesJsDesignLayer, type GrapesJsDesignLayerProps } from "@/components/layers/grapesjs-design-layer"

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
    component: BlogListLayer,
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
  "article-header": {
    component: ArticleHeaderLayer,
    propsSchema: z.object({
      title: z.string().optional(),
      imageUrl: z.string().optional(),
      authorName: z.string().optional(),
      publishedAt: z.string().optional(),
    }) satisfies z.ZodType<ArticleHeaderLayerProps>,
  },
  "grapesjs-design": {
    component: GrapesJsDesignLayer,
    propsSchema: z.object({
      html: z.string().optional(),
      css: z.string().optional(),
    }) satisfies z.ZodType<GrapesJsDesignLayerProps>,
  },
  reference: {
    component: ReferenceCardLayer,
    propsSchema: z.object({
      title: z.string().optional(),
      excerpt: z.string().optional(),
      imageUrl: z.string().optional(),
      href: z.string().optional(),
    }) satisfies z.ZodType<ReferenceCardLayerProps>,
  },
  columns: {
    component: ColumnsLayer,
    // Nested blocks' own props are validated by BlockRenderer re-parsing
    // through their own layerType's propsSchema when rendered inside
    // ColumnsLayer — this envelope only needs to check the shape, not the
    // inner content.
    propsSchema: z.object({
      columnCount: z.number().min(2).max(3).optional(),
      columns: z.array(
        z.object({
          blocks: z.array(
            z.object({
              layerType: z.string(),
              props: z.record(z.string(), z.unknown()),
            }),
          ),
        }),
      ),
    }) satisfies z.ZodType<ColumnsLayerProps>,
  },
}
