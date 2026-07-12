import {
  LayoutTemplate,
  Columns2,
  Columns3,
  LayoutGrid,
  Table2,
  MessageSquareQuote,
  Megaphone,
  PartyPopper,
  Sparkles,
  FormInput,
  Newspaper,
  FileText,
  type LucideIcon,
} from "lucide-react"

/**
 * Charles (2026-07-09): "la bibliothèque de modules... doit faire apparaitre
 * un preview... on a pas les aperçus" — the block picker (page-editor.tsx)
 * and each added block's header (block-editor.tsx) only ever showed the raw
 * layerType string. No screenshot/render pipeline exists for the ~11 blocks
 * (@neomnia/ui isn't even a neosaas-v2 dependency), so a real visual preview
 * is out of scope here — this is the lightweight version: one distinct icon
 * + a readable label per block type, matching clientLayerRegistry's keys
 * (lib/layers/registry-client.ts).
 */
export const BLOCK_TYPE_ICONS: Record<string, LucideIcon> = {
  hero: LayoutTemplate,
  "hero-split": Columns2,
  "feature-grid": LayoutGrid,
  "pricing-table": Table2,
  testimonials: MessageSquareQuote,
  "cta-banner": Megaphone,
  "welcome-banner": PartyPopper,
  "icon-showcase": Sparkles,
  form: FormInput,
  "blog-list": Newspaper,
  content: FileText,
  columns: Columns3,
}

export const BLOCK_TYPE_LABELS: Record<string, string> = {
  hero: "Hero",
  "hero-split": "Hero (split)",
  "feature-grid": "Feature grid",
  "pricing-table": "Pricing table",
  testimonials: "Testimonials",
  "cta-banner": "CTA banner",
  "welcome-banner": "Welcome banner",
  "icon-showcase": "Icon showcase",
  form: "Form",
  "blog-list": "Blog list",
  content: "Content",
  columns: "Columns",
}

export function getBlockTypeIcon(blockType: string): LucideIcon {
  return BLOCK_TYPE_ICONS[blockType] ?? FileText
}

export function getBlockTypeLabel(blockType: string): string {
  return BLOCK_TYPE_LABELS[blockType] ?? blockType
}

// Same one-liner authored per block in @neomnia/ui's own ComponentSchema
// (payload-cms's source of truth for these blocks) — replicated here rather
// than imported since @neomnia/ui isn't a neosaas-v2 dependency. Kept in
// sync by hand; if this drifts, payload-cms/node_modules/@neomnia/ui/
// components/{slug}/config.ts is the reference to re-check against.
export const BLOCK_TYPE_DESCRIPTIONS: Record<string, string> = {
  hero: "Full-width hero section — eyebrow, title, subtitle, trust pills, up to two CTAs, background image.",
  "hero-split":
    "Two-column hero with eyebrow, title, CTAs and an icon-grid visual — matches the neomnia.net homepage hero layout.",
  "feature-grid": "Grid of feature cards, each with an icon, title, description and optional bullet list.",
  "pricing-table": "Marketing pricing plans — display only, not wired to a billing provider.",
  testimonials: "Wall of quotes — each with an author, optional photo, rating and highlighted metric.",
  "cta-banner": 'Full-width call-to-action section — "Ready to Get Started?" on neomnia.net.',
  "welcome-banner": "Gradient banner for dashboard-style welcome sections.",
  "icon-showcase": "Grid of icon badges over an optional background image or video.",
  form: "Generic lead-capture form — every field is authored here, covers contact, newsletter or any other use case.",
  "blog-list":
    "Configures how many posts to show and from which category — the consuming site queries its own posts at render time.",
  content: "Freeform rich-text block — for content that does not fit any structured block.",
  columns: "Layout container — splits content into 2-3 side-by-side columns, each holding its own set of blocks.",
}

export function getBlockTypeDescription(blockType: string): string | undefined {
  return BLOCK_TYPE_DESCRIPTIONS[blockType]
}

// Real screenshots, batch-rendered 2026-07-06 against @neomnia/ui's own
// components (Vite + Tailwind v4 + Playwright harness) and already served
// publicly by payload-cms's own Next.js app (public/block-thumbnails/) for
// ITS block picker — reused here by URL rather than duplicated, so neosaas-v2
// never needs its own render pipeline or a copy of these assets. welcome-
// banner/icon-showcase have none yet (added to @neomnia/ui after the batch
// render) — getBlockTypeThumbnail returns undefined for those, callers fall
// back to the icon-only card.
const THUMBNAIL_OVERRIDES: Record<string, string> = { hero: "hero-classic" }
const THUMBNAIL_BASE_URL = "https://cms.neokube.fr/block-thumbnails"
const NO_THUMBNAIL = new Set(["welcome-banner", "icon-showcase"])

export function getBlockTypeThumbnail(blockType: string): string | undefined {
  if (NO_THUMBNAIL.has(blockType)) return undefined
  const slug = THUMBNAIL_OVERRIDES[blockType] ?? blockType
  return `${THUMBNAIL_BASE_URL}/${slug}.png`
}

// Charles (2026-07-10): 3-way split — "projet dédié" (this client only),
// "projet neosaas" (specific to the NeoSaaS boilerplate/dashboard, not
// reusable outside it), "projet globales" (generic, reusable by any site).
// Refines the original 2-way library/project split (2026-07-09) once it
// became clear "library" was hiding two different things: truly generic
// marketing blocks vs. NeoSaaS-app-specific ones like welcome-banner.
export const BLOCK_SOURCE_LABELS: Record<"global" | "neosaas" | "project", string> = {
  global: "Global",
  neosaas: "NeoSaaS",
  project: "Project-specific",
}
