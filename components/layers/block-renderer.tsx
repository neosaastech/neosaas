import { layerRegistry } from "@/lib/layers/registry"
import { BlockWrapper } from "./block-wrapper"

export interface PageLayerRow {
  id: string
  layerType: string
  props: unknown
}

/**
 * Single rendering pipeline for any page built from Payload blocks — was
 * duplicated inline in both app/[locale]/(public)/features/page.tsx and
 * .../[...slug]/page.tsx (same layerRegistry lookup + propsSchema.parse +
 * <Component {...props}/> loop copy-pasted in each). Centralized here so a
 * page route only has to fetch its rows and render this once.
 *
 * `blockSettings` is stored inside `layer.props` (see payload-cms's
 * mapBlockToProps/syncPageToNeosaasApp) but deliberately isn't part of any
 * individual layer's own propsSchema — stripped out here and handed to
 * <BlockWrapper /> instead, so a layer component's props type only ever
 * describes its actual content.
 */
export function BlockRenderer({ layers, pagePath }: { layers: PageLayerRow[]; pagePath?: string }) {
  return (
    <>
      {layers.map((layer) => {
        const def = layerRegistry[layer.layerType]
        if (!def) {
          console.error(`Unknown layerType "${layer.layerType}"${pagePath ? ` for ${pagePath}` : ""}`)
          return null
        }
        const raw = (layer.props ?? {}) as Record<string, unknown>
        const { blockSettings, ...rest } = raw
        const props = def.propsSchema.parse(rest)
        const Component = def.component
        return (
          <BlockWrapper key={layer.id} settings={blockSettings}>
            <Component {...props} />
          </BlockWrapper>
        )
      })}
    </>
  )
}
