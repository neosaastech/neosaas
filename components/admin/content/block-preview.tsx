"use client"

import { layerRegistry } from "@/lib/layers/registry"
import type { PayloadPageBlock } from "@/lib/payload-bridge"

/**
 * Renders a block with its *current, unsaved* form values using the exact
 * same components the real site uses (lib/layers/registry.ts) — the live
 * preview this whole content-bridge was built to make possible, without an
 * iframe/postMessage: editing and rendering are the same React tree.
 * "blog-list" is the one dynamic block (queries a DB table server-side at
 * render time) and can't be meaningfully live-previewed from in-progress
 * form state — shown as a placeholder instead of trying to fake it.
 */
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

  const parsed = def.propsSchema.safeParse(block)
  if (!parsed.success) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Champs incomplets pour l&apos;aperçu de ce bloc.
      </div>
    )
  }

  const Component = def.component
  return <Component {...parsed.data} />
}
