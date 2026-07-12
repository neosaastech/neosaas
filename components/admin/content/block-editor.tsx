"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronUp, ChevronDown, ChevronRight, Trash2, Plus, Columns3 } from "lucide-react"
import { clientLayerRegistry } from "@/lib/layers/registry-client"
import { DynamicObjectForm } from "./dynamic-field"
import { BlockPickerDialog } from "./block-picker-dialog"
import type { PayloadPageBlock } from "@/lib/payload-bridge"
import { blockSettingsSchema } from "@/lib/layers/block-settings"
import { getBlockTypeIcon, getBlockTypeLabel } from "./block-type-meta"
import { cn } from "@/lib/utils"
import { z } from "zod"

interface BlockEditorProps {
  block: PayloadPageBlock
  onChange: (next: PayloadPageBlock) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  // Charles (2026-07-09): "on doit avoir la possibilité de replier les
  // modules pour éviter le désordre" — a page with several blocks, each
  // with many fields + style, becomes a long form to scroll through.
  // Existing blocks (loaded with the doc) start collapsed; a block just
  // added in this session starts expanded so you can fill it in right
  // away — the caller decides which via this prop (see page-editor.tsx/
  // article-editor.tsx). Defaults true so ColumnsBlockEditor's nested
  // children (which don't pass it) keep their previous always-open
  // behavior — collapsing wasn't asked for inside columns.
  defaultExpanded?: boolean
}

export function BlockEditor(props: BlockEditorProps) {
  // Charles (2026-07-09): "il manque... prototype nested Grid/Layout
  // container block à refaire" — "columns" (payload-cms's Columns.ts) is a
  // recursive container (each column holds its own list of ordinary
  // blocks), a shape no Zod-driven generic form can render sanely. Special-
  // cased before the generic clientLayerRegistry lookup below, which is why
  // "columns" only needs a placeholder entry there (AVAILABLE_BLOCK_TYPES +
  // BlockPreview's own source/label lookup), not a real form schema.
  if (props.block.blockType === "columns") {
    return <ColumnsBlockEditor {...props} />
  }

  const { block, onChange, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, defaultExpanded = true } = props
  const def = clientLayerRegistry[block.blockType]
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (!def) {
    return (
      <Card shadow="flat">
        <CardContent className="pt-6 text-sm text-destructive">
          Unknown block type: {block.blockType}
        </CardContent>
      </Card>
    )
  }

  const Icon = getBlockTypeIcon(block.blockType)

  return (
    <Card shadow="raised" className="border-l-4 border-l-brand">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <button
          type="button"
          className="flex items-center gap-1.5 text-left"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <Badge variant="outline" className="gap-1.5">
            <Icon className="h-3.5 w-3.5" />
            {getBlockTypeLabel(block.blockType)}
          </Badge>
        </button>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" disabled={!canMoveUp} onClick={onMoveUp}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" disabled={!canMoveDown} onClick={onMoveDown}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {expanded && (
      <CardContent className="flex flex-col gap-4">
        <DynamicObjectForm
          schema={def.propsSchema as z.ZodObject<z.ZodRawShape>}
          value={block}
          onChange={(next) => onChange({ ...next, blockType: block.blockType, id: block.id })}
        />
        <div className="border-t pt-4">
          <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">Style</p>
          <DynamicObjectForm
            schema={blockSettingsSchema}
            value={(block.blockSettings as Record<string, unknown>) ?? {}}
            onChange={(next) => onChange({ ...block, blockSettings: next })}
          />
        </div>
      </CardContent>
      )}
    </Card>
  )
}

export const AVAILABLE_BLOCK_TYPES = Object.keys(clientLayerRegistry)

interface ColumnRow {
  id?: string
  blocks?: PayloadPageBlock[]
}

const MAX_COLUMNS = 3

function ColumnsBlockEditor({ block, onChange, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockEditorProps) {
  const columnCount = (block.columnCount as string) ?? "2"
  const columns = (block.columns as ColumnRow[] | undefined) ?? []

  function updateColumns(next: ColumnRow[]) {
    onChange({ ...block, columns: next })
  }

  function addColumn() {
    if (columns.length >= MAX_COLUMNS) return
    updateColumns([...columns, { blocks: [] }])
  }

  function removeColumn(colIndex: number) {
    updateColumns(columns.filter((_, i) => i !== colIndex))
  }

  function addBlockToColumn(colIndex: number, blockType: string) {
    const col = columns[colIndex]
    updateColumns(
      columns.map((c, i) => (i === colIndex ? { ...c, blocks: [...(col.blocks ?? []), { blockType }] } : c)),
    )
  }

  function updateBlockInColumn(colIndex: number, blockIndex: number, next: PayloadPageBlock) {
    updateColumns(
      columns.map((c, i) =>
        i === colIndex ? { ...c, blocks: (c.blocks ?? []).map((b, bi) => (bi === blockIndex ? next : b)) } : c,
      ),
    )
  }

  function removeBlockInColumn(colIndex: number, blockIndex: number) {
    updateColumns(
      columns.map((c, i) => (i === colIndex ? { ...c, blocks: (c.blocks ?? []).filter((_, bi) => bi !== blockIndex) } : c)),
    )
  }

  function moveBlockInColumn(colIndex: number, blockIndex: number, direction: -1 | 1) {
    const col = columns[colIndex]
    const blocksArr = [...(col.blocks ?? [])]
    const target = blockIndex + direction
    if (target < 0 || target >= blocksArr.length) return
    ;[blocksArr[blockIndex], blocksArr[target]] = [blocksArr[target], blocksArr[blockIndex]]
    updateColumns(columns.map((c, i) => (i === colIndex ? { ...c, blocks: blocksArr } : c)))
  }

  return (
    <Card shadow="raised" className="border-l-4 border-l-brand">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <Badge variant="outline" className="gap-1.5">
          <Columns3 className="h-3.5 w-3.5" />
          Columns
        </Badge>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" disabled={!canMoveUp} onClick={onMoveUp}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" disabled={!canMoveDown} onClick={onMoveDown}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label>Layout</Label>
          <Select value={columnCount} onValueChange={(next) => onChange({ ...block, columnCount: next })}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 columns</SelectItem>
              <SelectItem value="3">3 columns</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={cn("grid gap-4", columnCount === "3" ? "md:grid-cols-3" : "md:grid-cols-2")}>
          {columns.map((col, colIndex) => (
            <div key={col.id ?? colIndex} className="flex flex-col gap-3 rounded-md border border-dashed p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Column {colIndex + 1}</p>
                {columns.length > 1 && (
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeColumn(colIndex)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {(col.blocks ?? []).map((childBlock, blockIndex) => (
                // Nested blocks use the exact same flat Payload shape as
                // top-level page/article blocks (confirmed in payload-cms's
                // Columns.ts) — no shape adapter needed, BlockEditor just
                // recurses. Columns.ts deliberately disallows nesting a
                // Columns block inside a column, hence exclude={["columns"]}
                // on the BlockPickerDialog below.
                <BlockEditor
                  key={childBlock.id ?? blockIndex}
                  block={childBlock}
                  onChange={(next) => updateBlockInColumn(colIndex, blockIndex, next)}
                  onRemove={() => removeBlockInColumn(colIndex, blockIndex)}
                  onMoveUp={() => moveBlockInColumn(colIndex, blockIndex, -1)}
                  onMoveDown={() => moveBlockInColumn(colIndex, blockIndex, 1)}
                  canMoveUp={blockIndex > 0}
                  canMoveDown={blockIndex < (col.blocks?.length ?? 0) - 1}
                />
              ))}

              <BlockPickerDialog
                onSelect={(type) => addBlockToColumn(colIndex, type)}
                exclude={["columns"]}
                triggerClassName="w-full"
              />
            </div>
          ))}
        </div>

        {columns.length < MAX_COLUMNS && (
          <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={addColumn}>
            <Plus className="h-3.5 w-3.5" />
            Add column
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
