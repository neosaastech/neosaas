import { layerRegistry } from "@/lib/layers/registry"
import { buildPageTemplateContext, interpolateDeep } from "@/lib/pages/template-variables"
import { getModuleForAnchor } from "@/app/actions/site-nav"
import { BlockWrapper } from "./block-wrapper"

export interface PageLayerRow {
  id: string
  layerType: string
  props: unknown
}

/**
 * A `module-anchor` block (payload-cms src/blocks/ModuleAnchor.ts) carries
 * no content of its own — it's a position marker an editor drops into a
 * page's layout. At render time, resolve whichever Module targets this
 * anchorKey on this page (Page > Category > PageType > Default precedence,
 * same as Header/Footer) and render its blocks right here, recursing back
 * into BlockRenderer itself so a Module's own content gets the exact same
 * rendering pipeline (template variables, blockSettings, safeParse) as a
 * page's own blocks — no separate, narrower renderer for Modules.
 */
async function ModuleAnchorSlot({
  anchorKey,
  pagePath,
  locale,
}: {
  anchorKey: string | undefined
  pagePath?: string
  locale: string
}) {
  if (!anchorKey || !pagePath) return null
  const module = await getModuleForAnchor(anchorKey, pagePath, locale)
  if (!module?.blocks?.length) return null
  const layers: PageLayerRow[] = module.blocks.map((block, index) => ({
    id: `${anchorKey}-${index}`,
    layerType: block.layerType,
    props: block.props,
  }))
  return <BlockRenderer layers={layers} pagePath={pagePath} locale={locale} />
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
        if (layer.layerType === "module-anchor") {
          const anchorKey = (layer.props as { anchorKey?: string } | undefined)?.anchorKey
          return <ModuleAnchorSlot key={layer.id} anchorKey={anchorKey} pagePath={pagePath} locale={locale} />
        }
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
