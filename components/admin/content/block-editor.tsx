"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react"
import { layerRegistry } from "@/lib/layers/registry"
import { DynamicObjectForm } from "./dynamic-field"
import type { PayloadPageBlock } from "@/lib/payload-bridge"
import { z } from "zod"

export function BlockEditor({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  block: PayloadPageBlock
  onChange: (next: PayloadPageBlock) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const def = layerRegistry[block.blockType]

  if (!def) {
    return (
      <Card shadow="flat">
        <CardContent className="pt-6 text-sm text-destructive">
          Type de bloc inconnu : {block.blockType}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card shadow="raised">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <Badge variant="outline">{block.blockType}</Badge>
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
      <CardContent>
        <DynamicObjectForm
          schema={def.propsSchema as z.ZodObject<z.ZodRawShape>}
          value={block}
          onChange={(next) => onChange({ ...next, blockType: block.blockType, id: block.id })}
        />
      </CardContent>
    </Card>
  )
}

export const AVAILABLE_BLOCK_TYPES = Object.keys(layerRegistry)
