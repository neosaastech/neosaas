/**
 * Canonical prop vocabulary for page layers (Pilier G — Normes de nommage & design tokens).
 * Every layer's propsSchema must reuse these names for these concepts — never invent a
 * synonym. New concepts not covered here (e.g. `authorName`, `rating`) are fine to add;
 * this list only locks down names that already have an established meaning, so the
 * pilotage JSON / admin composition tooling (Pilier E) can build generic forms/validators
 * instead of special-casing every layer.
 */

export const ALLOWED_PROP_NAMES = [
  "title",
  "subtitle",
  "body",
  "ctaLabel",
  "ctaHref",
  "secondaryCtaLabel",
  "secondaryCtaHref",
  "items",
  "imageUrl",
  "name",
  "price",
  "period",
  "bullets",
  "highlighted",
  "authorName",
  "authorRole",
  "rating",
  "eyebrow",
  "trustPills",
  "metric",
] as const

export type AllowedPropName = (typeof ALLOWED_PROP_NAMES)[number]

/** Forbidden synonym → canonical name it duplicates. */
export const FORBIDDEN_PROP_SYNONYMS: Record<string, AllowedPropName> = {
  heading: "title",
  titre: "title",
  text1: "title",
  buttonText: "ctaLabel",
  buttonLabel: "ctaLabel",
  link: "ctaHref",
  url: "ctaHref",
  buttonText2: "secondaryCtaLabel",
  secondaryButtonLabel: "secondaryCtaLabel",
  link2: "secondaryCtaHref",
  data: "items",
  list: "items",
  entries: "items",
  plans: "items",
  testimonials: "items",
  image: "imageUrl",
  img: "imageUrl",
  photo: "imageUrl",
  avatarUrl: "imageUrl",
  planName: "name",
  featured: "highlighted",
  popular: "highlighted",
  author: "authorName",
  quote: "body",
  role: "authorRole",
  company: "authorRole",
  kicker: "eyebrow",
  label: "eyebrow",
  tag: "eyebrow",
  overline: "eyebrow",
  badges: "trustPills",
  chips: "trustPills",
  stat: "metric",
  kpi: "metric",
}

/**
 * Pairs that must always be declared together, never alone — a CTA without
 * its href (or vice versa) is a broken button, not a valid partial state.
 */
export const REQUIRED_PROP_PAIRS: readonly [AllowedPropName, AllowedPropName][] = [
  ["ctaLabel", "ctaHref"],
  ["secondaryCtaLabel", "secondaryCtaHref"],
]
