"use client"

/**
 * Real Puck config (2026-07-04) — one entry per lib/layers/registry.ts block,
 * rendering the SAME production components used by the public site
 * (HeroLayer, FeatureGridLayer, etc.), not a re-interpretation. Fields mirror
 * each block's real Zod propsSchema so nothing here can produce props the
 * registry would reject.
 *
 * blog-list is the one exception: its real component queries the DB at
 * render time (async Server Component), which can't run live inside Puck's
 * client-side editor canvas — it gets a static placeholder here and only
 * ever uses the real BlogListLayer through the public <Render> path
 * (see app/[locale]/(public)/[...slug]/page.tsx), never inside the editor.
 */
import type { Config } from "@puckeditor/core"
import { HeroLayer } from "@/components/layers/hero-layer"
import { FeatureGridLayer } from "@/components/layers/feature-grid-layer"
import { PricingTableLayer } from "@/components/layers/pricing-table-layer"
import { TestimonialsLayer } from "@/components/layers/testimonials-layer"
import { CtaBannerLayer } from "@/components/layers/cta-banner-layer"
import { WelcomeBannerLayer } from "@/components/layers/welcome-banner-layer"
import { IconShowcaseLayer } from "@/components/layers/icon-showcase-layer"
import { FormLayer } from "@/components/layers/form-layer"
import { DEFAULT_ICON_SHOWCASE_ITEMS } from "@/components/preline/marketing/icon-showcase-panel"

// Puck's array fields flatten to one level of scalars per item — bullets
// (string[] in the real schema) is authored here as one newline-separated
// textarea and split back into an array at the config/page_layers boundary
// (lib/puck/bridge.ts), same trick used in the earlier spike.

type PuckLayerComponents = {
  hero: {
    eyebrow?: string
    title: string
    subtitle?: string
    ctaLabel?: string
    ctaHref?: string
    secondaryCtaLabel?: string
    secondaryCtaHref?: string
    imageUrl?: string
    videoUrl?: string
  }
  "feature-grid": {
    eyebrow?: string
    title?: string
    items: { icon: string; title: string; description: string; bullets: string }[]
  }
  "pricing-table": {
    eyebrow?: string
    title?: string
    items: {
      name: string
      price: string
      period?: string
      bullets: string
      ctaLabel: string
      ctaHref: string
      highlighted?: boolean
    }[]
  }
  testimonials: {
    eyebrow?: string
    title?: string
    items: {
      body: string
      authorName: string
      authorRole?: string
      imageUrl?: string
      rating?: number
      metric?: string
    }[]
  }
  "cta-banner": {
    eyebrow?: string
    title: string
    subtitle?: string
    ctaLabel: string
    ctaHref: string
  }
  "welcome-banner": {
    title: string
    subtitle?: string
    ctaLabel?: string
    ctaHref?: string
  }
  "icon-showcase": {
    items: { icon: string; label: string; highlighted?: boolean }[]
    imageUrl?: string
    videoUrl?: string
    overlayIcons?: boolean
  }
  form: {
    eyebrow?: string
    title?: string
    subtitle?: string
    name: string
    items: { name: string; label: string; type: "text" | "email" | "textarea" | "checkbox"; required?: boolean }[]
    submitLabel?: string
    successMessage?: string
  }
  "blog-list": {
    eyebrow?: string
    title?: string
    subtitle?: string
    limit?: number
    categorySlug?: string
  }
}

export const puckConfig: Config<PuckLayerComponents> = {
  components: {
    hero: {
      label: "Hero",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        subtitle: { type: "textarea" },
        ctaLabel: { type: "text" },
        ctaHref: { type: "text" },
        secondaryCtaLabel: { type: "text" },
        secondaryCtaHref: { type: "text" },
        imageUrl: { type: "text" },
        videoUrl: { type: "text" },
      },
      defaultProps: { title: "Titre du hero" },
      render: (props) => <HeroLayer {...props} />,
    },
    "feature-grid": {
      label: "Grille de fonctionnalités",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            icon: { type: "text" },
            title: { type: "text" },
            description: { type: "textarea" },
            bullets: { type: "textarea" },
          },
        },
      },
      defaultProps: { items: [] },
      render: ({ items, ...rest }) => (
        <FeatureGridLayer
          {...rest}
          items={items.map((i) => ({ ...i, bullets: i.bullets ? i.bullets.split("\n").filter(Boolean) : [] }))}
        />
      ),
    },
    "pricing-table": {
      label: "Grille tarifaire",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            name: { type: "text" },
            price: { type: "text" },
            period: { type: "text" },
            bullets: { type: "textarea" },
            ctaLabel: { type: "text" },
            ctaHref: { type: "text" },
            highlighted: { type: "radio", options: [{ label: "Oui", value: true }, { label: "Non", value: false }] },
          },
        },
      },
      defaultProps: { items: [] },
      render: ({ items, ...rest }) => (
        <PricingTableLayer
          {...rest}
          items={items.map((i) => ({ ...i, bullets: i.bullets ? i.bullets.split("\n").filter(Boolean) : [] }))}
        />
      ),
    },
    testimonials: {
      label: "Témoignages",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            body: { type: "textarea" },
            authorName: { type: "text" },
            authorRole: { type: "text" },
            imageUrl: { type: "text" },
            rating: { type: "number", min: 1, max: 5 },
            metric: { type: "text" },
          },
        },
      },
      defaultProps: { items: [] },
      render: (props) => <TestimonialsLayer {...props} />,
    },
    "cta-banner": {
      label: "Bandeau d'appel à l'action",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        subtitle: { type: "textarea" },
        ctaLabel: { type: "text" },
        ctaHref: { type: "text" },
      },
      defaultProps: { title: "Titre du bandeau", ctaLabel: "En savoir plus", ctaHref: "/" },
      render: (props) => <CtaBannerLayer {...props} />,
    },
    "welcome-banner": {
      label: "Bandeau de bienvenue",
      fields: {
        title: { type: "text" },
        subtitle: { type: "textarea" },
        ctaLabel: { type: "text" },
        ctaHref: { type: "text" },
      },
      defaultProps: {
        title: "Bienvenue",
        subtitle: "Gérez vos services, suivez votre utilisation et explorez notre marketplace.",
      },
      render: (props) => <WelcomeBannerLayer {...props} />,
    },
    "icon-showcase": {
      label: "Grille d'icônes",
      fields: {
        imageUrl: { type: "text", label: "URL image" },
        videoUrl: { type: "text", label: "URL vidéo" },
        overlayIcons: {
          type: "radio",
          label: "Icônes par-dessus le média",
          options: [
            { label: "Oui", value: true },
            { label: "Non (média seul)", value: false },
          ],
        },
        items: {
          type: "array",
          arrayFields: {
            icon: { type: "text" },
            label: { type: "text" },
            highlighted: {
              type: "radio",
              options: [
                { label: "Oui", value: true },
                { label: "Non", value: false },
              ],
            },
          },
        },
      },
      defaultProps: { items: DEFAULT_ICON_SHOWCASE_ITEMS, overlayIcons: true },
      render: (props) => <IconShowcaseLayer {...props} />,
    },
    form: {
      label: "Formulaire",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        subtitle: { type: "textarea" },
        name: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            name: { type: "text" },
            label: { type: "text" },
            type: {
              type: "select",
              options: [
                { label: "Texte", value: "text" },
                { label: "Email", value: "email" },
                { label: "Zone de texte", value: "textarea" },
                { label: "Case à cocher", value: "checkbox" },
              ],
            },
            required: { type: "radio", options: [{ label: "Oui", value: true }, { label: "Non", value: false }] },
          },
        },
        submitLabel: { type: "text" },
        successMessage: { type: "text" },
      },
      defaultProps: { name: "contact", items: [] },
      render: (props) => <FormLayer {...props} />,
    },
    "blog-list": {
      label: "Liste d'articles",
      fields: {
        eyebrow: { type: "text" },
        title: { type: "text" },
        subtitle: { type: "textarea" },
        limit: { type: "number" },
        categorySlug: { type: "text" },
      },
      defaultProps: {},
      render: ({ title }) => (
        <div className="mx-auto mt-16 max-w-5xl rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="font-medium">{title || "Liste d'articles"}</p>
          <p className="text-sm">Aperçu indisponible dans l&apos;éditeur — rendu en direct sur la vraie page (requête base de données).</p>
        </div>
      ),
    },
  },
}
