import { layerRegistry } from "@/lib/layers/registry"
import { buildPageTemplateContext, interpolateDeep } from "@/lib/pages/template-variables"
import { BlockWrapper } from "./block-wrapper"

export interface PageLayerRow {
  id: string
  layerType: string
  props: unknown
}

/**
 * Single rendering pipeline for any page built from Payload blocks.
 * Resolves `{{variable}}` placeholders in layer props at render time
 * (see lib/pages/template-variables.ts).
 */
export async function BlockRenderer({
  layers,
  pagePath,
  locale = "fr",
}: {
  layers: PageLayerRow[]
  pagePath?: string
  locale?: string
}) {
  const variables = await buildPageTemplateContext(locale)

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
        const resolved = interpolateDeep(rest, variables)
        // .safeParse, not .parse: one malformed row (stale sync, hand-edited
        // DB row, a field shape that changed since the row was written) must
        // not take the whole page down with a 500 — skip just that block,
        // same as the unknown-layerType branch above already does.
        const result = def.propsSchema.safeParse(resolved)
        if (!result.success) {
          console.error(`Invalid props for layerType "${layer.layerType}"${pagePath ? ` on ${pagePath}` : ""}:`, result.error.issues)
          return null
        }
        const props = result.data
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
