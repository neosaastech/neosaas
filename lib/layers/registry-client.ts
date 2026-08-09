import { z } from "zod"
import type { ComponentType } from "react"
import { HeroLayer, type HeroLayerProps } from "@/components/layers/hero-layer"
import { HeroSplitLayer, type HeroSplitLayerProps } from "@/components/layers/hero-split-layer"
import { FeatureGridLayer, type FeatureGridLayerProps } from "@/components/layers/feature-grid-layer"
import { PricingTableLayer, type PricingTableLayerProps } from "@/components/layers/pricing-table-layer"
import { TestimonialsLayer, type TestimonialsLayerProps } from "@/components/layers/testimonials-layer"
import { CtaBannerLayer, type CtaBannerLayerProps } from "@/components/layers/cta-banner-layer"
import { WelcomeBannerLayer, type WelcomeBannerLayerProps } from "@/components/layers/welcome-banner-layer"
import { IconShowcaseLayer, type IconShowcaseLayerProps } from "@/components/layers/icon-showcase-layer"
import { FormLayer, type FormLayerProps } from "@/components/layers/form-layer"
import type { BlogListLayerProps } from "@/components/layers/blog-list-layer"
import type { CategoryListLayerProps } from "@/components/layers/category-list-layer"
import { ContentLayer, type ContentLayerProps } from "@/components/layers/content-layer"
import { CodeShowcaseLayer, type CodeShowcaseLayerProps } from "@/components/layers/code-showcase-layer"
import { FeaturesListLayer, type FeaturesListLayerProps } from "@/components/layers/features-list-layer"
import { LogoCloudLayer, type LogoCloudLayerProps } from "@/components/layers/logo-cloud-layer"

export interface LayerDefinition {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>
  propsSchema: z.ZodObject<z.ZodRawShape>
  // 3-way classification (Charles, 2026-07-09 then refined 2026-07-10):
  // "global" = generic, reusable by any site (most @neomnia/ui blocks);
  // "neosaas" = specific to the NeoSaaS boilerplate/dashboard, not reusable
  // outside it (e.g. welcome-banner); "project" = specific to this one
  // client, added as the need arises — none exist yet.
  source: "global" | "neosaas" | "project"
}

const featureGridItemSchema = z.object({
  icon: z.string(),
  iconSize: z.enum(["sm", "md", "lg"]).optional(),
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

const heroSplitHighlightSchema = z.object({
  icon: z.string(),
  label: z.string(),
  // Payload gives null for an unset checkbox, not undefined — .optional()
  // alone rejects null and crashes the whole page render at .parse() time
  // (confirmed live 2026-07-09, same root cause as the theme_config
  // incident: an unvalidated assumption about "unset" shape). Mappers
  // already coerce to undefined too; this is the schema-level backstop.
  featured: z.boolean().nullable().optional(),
})

const formFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "textarea", "checkbox"]),
  required: z.boolean().optional(),
})

const featuresListItemSchema = z.object({
  title: z.string(),
  description: z.string(),
})

const logoCloudItemSchema = z.object({
  name: z.string(),
  imageUrl: z.string().optional(),
  markup: z.string().optional(),
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
    source: "global",
  },
  "hero-split": {
    component: HeroSplitLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      brandName: z.string().optional(),
      title: z.string(),
      subtitle: z.string().optional(),
      highlights: z.array(heroSplitHighlightSchema).optional(),
      ctaLabel: z.string().optional(),
      ctaHref: z.string().optional(),
      secondaryCtaLabel: z.string().optional(),
      secondaryCtaHref: z.string().optional(),
      imageUrl: z.string().optional(),
    }) satisfies z.ZodType<HeroSplitLayerProps>,
    source: "global",
  },
  "feature-grid": {
    component: FeatureGridLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      items: z.array(featureGridItemSchema),
    }) satisfies z.ZodType<FeatureGridLayerProps>,
    source: "global",
  },
  "pricing-table": {
    component: PricingTableLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      items: z.array(pricingTablePlanSchema),
    }) satisfies z.ZodType<PricingTableLayerProps>,
    source: "global",
  },
  testimonials: {
    component: TestimonialsLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      items: z.array(testimonialItemSchema),
    }) satisfies z.ZodType<TestimonialsLayerProps>,
    source: "global",
  },
  "cta-banner": {
    component: CtaBannerLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string(),
      subtitle: z.string().optional(),
      ctaLabel: z.string().optional(),
      ctaHref: z.string().optional(),
    }) satisfies z.ZodType<CtaBannerLayerProps>,
    source: "global",
  },
  "welcome-banner": {
    component: WelcomeBannerLayer,
    propsSchema: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      ctaLabel: z.string().optional(),
      ctaHref: z.string().optional(),
    }) satisfies z.ZodType<WelcomeBannerLayerProps>,
    // Dashboard-style welcome banner — a NeoSaaS boilerplate concept (the
    // private app shell), not a generic marketing block any site would use.
    source: "neosaas",
  },
  "icon-showcase": {
    component: IconShowcaseLayer,
    propsSchema: z.object({
      items: z.array(iconShowcaseItemSchema).optional(),
      imageUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      overlayIcons: z.boolean().optional(),
    }) satisfies z.ZodType<IconShowcaseLayerProps>,
    source: "global",
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
    source: "global",
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
    source: "global",
  },
  "category-list": {
    component: NoopLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      limit: z.number().optional(),
    }) satisfies z.ZodType<CategoryListLayerProps>,
    source: "global",
  },
  content: {
    component: ContentLayer,
    propsSchema: z.object({
      bodyHtml: z.string(),
    }) satisfies z.ZodType<ContentLayerProps>,
    source: "global",
  },
  // Charles (2026-07-09): "il manque... I7: prototype nested Grid/Layout
  // container block à refaire" — the site-rendering side (registry.ts's own
  // "columns" entry, ColumnsLayer, payload-cms's Columns.ts, the sync
  // mapper) already existed, but this client-side registry never got an
  // entry, so BlockEditor's clientLayerRegistry[block.blockType] lookup
  // failed for any page using it — confirmed live, "Unknown block type:
  // columns" on Charles's own "documentation" page, unopenable/unremovable
  // from Content Hub. BlockEditor special-cases "columns" before reaching
  // this entry's propsSchema at all (recursive nested-block editing has no
  // sane Zod-driven generic form) — this entry only exists so the block
  // shows up in AVAILABLE_BLOCK_TYPES (the "Add block" picker) and so
  // BlockPreview's own "columns" special-case (a structural placeholder,
  // not a real nested render — same "no live preview" pattern already used
  // for blog-list) has a source/label to read.
  columns: {
    component: NoopLayer,
    propsSchema: z.object({
      columnCount: z.union([z.literal("2"), z.literal("3")]).optional(),
      columns: z.array(z.object({ blocks: z.array(z.record(z.string(), z.unknown())).optional() })).optional(),
    }),
    source: "global",
  },
  "code-showcase": {
    component: CodeShowcaseLayer,
    propsSchema: z.object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      blockTitle: z.string().optional(),
      blockDescription: z.string().optional(),
      code: z.string(),
    }) satisfies z.ZodType<CodeShowcaseLayerProps>,
    source: "global",
  },
  "features-list": {
    component: FeaturesListLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      items: z.array(featuresListItemSchema),
      imageUrl: z.string().optional(),
    }) satisfies z.ZodType<FeaturesListLayerProps>,
    source: "global",
  },
  "logo-cloud": {
    component: LogoCloudLayer,
    propsSchema: z.object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      items: z.array(logoCloudItemSchema),
    }) satisfies z.ZodType<LogoCloudLayerProps>,
    source: "global",
  },
}