/**
 * Converts between Puck's <Puck>/<Render> data shape ({ content: [{type,
 * props}], root }) and the existing page_layers row shape (pagePath,
 * position, layerType, props) already read by the public site
 * (app/[locale]/(public)/[...slug]/page.tsx, /features) and written by
 * POST /api/admin/pilot/apply's set_layers action (lib/pilot/actions.ts).
 *
 * Puck's own "id" field (its internal per-instance tracking key) has no
 * equivalent in page_layers and is stripped on the way out.
 */
import type { Data } from "@puckeditor/core"

export interface PageLayerRow {
  layerType: string
  position: number
  props: Record<string, unknown>
}

export function puckDataToLayerRows(data: Data): PageLayerRow[] {
  return data.content.map((item, position) => {
    const { id: _id, ...props } = item.props as Record<string, unknown> & { id: string }
    return { layerType: item.type as string, position, props }
  })
}

// lib/layers/registry.ts's real Zod schemas store bullets as string[] (what
// the public site actually renders) — the Puck editor fields for these two
// block types edit them as one newline-per-item textarea instead (Puck's
// array fields don't have a native "list of strings" sub-field type).
// Loading a real page_layers row must join the array back into that string
// shape, mirroring the split() done in lib/puck/config.tsx's render
// functions — without this, editing a page with real content (rather than
// starting from an empty page) throws (arrays don't have .split()).
const BLOCK_TYPES_WITH_ITEM_BULLETS = new Set(["feature-grid", "pricing-table"])

export function layerRowsToPuckData(rows: PageLayerRow[]): Data {
  return {
    content: rows
      .sort((a, b) => a.position - b.position)
      .map((row, i) => {
        let props = row.props
        if (BLOCK_TYPES_WITH_ITEM_BULLETS.has(row.layerType) && Array.isArray(props.items)) {
          props = {
            ...props,
            items: (props.items as Record<string, unknown>[]).map((item) => ({
              ...item,
              bullets: Array.isArray(item.bullets) ? (item.bullets as string[]).join("\n") : item.bullets,
            })),
          }
        }
        return {
          type: row.layerType,
          props: { id: `${row.layerType}-${i}-${row.position}`, ...props },
        }
      }),
    root: { props: {} },
  } as Data
}
