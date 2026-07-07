/**
 * "columns" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 * Side-by-side layout container — each column re-runs BlockRenderer over its
 * own nested blocks (synced as part of this layer's own props, not separate
 * page_layers rows — see payload-cms's sync/targets/neosaas-app.ts 'columns' case).
 */
import { BlockRenderer, type PageLayerRow } from "./block-renderer"

export interface ColumnsLayerColumn {
  blocks: Array<{ layerType: string; props: unknown }>
}

export interface ColumnsLayerProps {
  columnCount?: number
  columns: ColumnsLayerColumn[]
}

export function ColumnsLayer({ columnCount = 2, columns }: ColumnsLayerProps) {
  const gridColsClass = columnCount === 3 ? "md:grid-cols-3" : "md:grid-cols-2"

  return (
    <div className={`grid gap-8 ${gridColsClass}`}>
      {columns.map((column, columnIndex) => {
        const layers: PageLayerRow[] = column.blocks.map((block, blockIndex) => ({
          id: `column-${columnIndex}-block-${blockIndex}`,
          layerType: block.layerType,
          props: block.props,
        }))
        return (
          <div key={columnIndex}>
            <BlockRenderer layers={layers} />
          </div>
        )
      })}
    </div>
  )
}
