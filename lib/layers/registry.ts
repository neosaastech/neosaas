import { z } from "zod"

/**
 * Single source of truth for page layer types (Pilier G — Normes de nommage & design tokens).
 * A layerType is kebab-case `{domaine}-{élément}` (e.g. `hero`, `pricing-table`,
 * `feature-grid`, `contact-form`, `cta`, `testimonials`). No synonyms: a new layer close to
 * an existing one extends its propsSchema instead of registering a near-duplicate entry.
 *
 * Populated by Pilier C (Calques de page) — empty until that pillar starts.
 */

export interface LayerDefinition {
  layerType: string
  propsSchema: z.ZodObject<z.ZodRawShape>
}

export const layerRegistry: LayerDefinition[] = []
