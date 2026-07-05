"use client"

import { layerRegistry } from "@/lib/layers/registry"
import type { PayloadPageBlock } from "@/lib/payload-bridge"
import { BlockWrapper } from "@/components/layers/block-wrapper"

/**
 * Renders a block with its *current, unsaved* form values using the exact
 * same components the real site uses (lib/layers/registry.ts) — the live
 * preview this whole content-bridge was built to make possible, without an
 * iframe/postMessage: editing and rendering are the same React tree.
 * "blog-list" is the one dynamic block (queries a DB table server-side at
 * render time) and can't be meaningfully live-previewed from in-progress
 * form state — shown as a placeholder instead of trying to fake it.
 */
// Payload stores an untouched optional field as `null`, not "absent" —
// every propsSchema here declares those fields `z.string().optional()`
// (undefined-or-string), which Zod fails on `null` since it's neither.
// Found 2026-07-05: a page's hero block (title + subtitle filled in,
// eyebrow left blank) showed "Champs incomplets" despite having every
// field the form actually asked for — the blank `eyebrow` (stored as
// `null`) was failing validation silently, a false negative, not a real
// incompleteness. Stripping nulls before validating (schemas themselves
// are untouched, so a truly missing required field like `title` still
// correctly fails) fixes that without loosening what counts as complete.
function stripNulls<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === null ? undefined : v])) as T
}

export function BlockPreview({ block }: { block: PayloadPageBlock }) {
  const def = layerRegistry[block.blockType]
  if (!def) return null

  if (block.blockType === "blog-list") {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aperçu non disponible pour ce bloc — affiche les derniers articles en direct sur le site réel.
      </div>
    )
  }

  const parsed = def.propsSchema.safeParse(stripNulls(block))
  if (!parsed.success) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Champs incomplets pour l&apos;aperçu de ce bloc.
      </div>
    )
  }

  const Component = def.component
  return (
    <BlockWrapper settings={block.blockSettings}>
      <Component {...parsed.data} />
    </BlockWrapper>
  )
}
