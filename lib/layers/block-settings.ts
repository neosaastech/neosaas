import { z } from "zod"

/**
 * Generic per-block styling controls (Pilier C extension, 2026-07-05) —
 * mirrors payload-cms's src/blocks/shared/blockSettings.ts group field.
 * Deliberately kept separate from each layer's own propsSchema in
 * lib/layers/registry.ts: content vs. presentation stay two different
 * concerns, so a block's Props interface never needs to know these exist —
 * <BlockWrapper /> is the only thing that reads this shape.
 */
export const blockSettingsSchema = z.object({
  backgroundColor: z.enum(["white", "gray", "dark", "brand"]).optional(),
  padding: z.enum(["none", "normal", "large"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  hasBorder: z.boolean().optional(),
})

export type BlockSettings = z.infer<typeof blockSettingsSchema>

const BACKGROUND_CLASSES: Record<NonNullable<BlockSettings["backgroundColor"]>, string> = {
  white: "bg-background",
  gray: "bg-muted",
  dark: "bg-slate-900 text-white",
  brand: "bg-brand text-white",
}

const PADDING_CLASSES: Record<NonNullable<BlockSettings["padding"]>, string> = {
  none: "py-0",
  normal: "py-12 md:py-16",
  large: "py-24 md:py-36",
}

const TEXT_ALIGN_CLASSES: Record<NonNullable<BlockSettings["textAlign"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

/** Turns a block's stored settings into the Tailwind classes `<BlockWrapper />` applies. */
export function resolveBlockSettingsClassName(settings: BlockSettings | undefined): string {
  const classes = [
    BACKGROUND_CLASSES[settings?.backgroundColor ?? "white"],
    PADDING_CLASSES[settings?.padding ?? "normal"],
    TEXT_ALIGN_CLASSES[settings?.textAlign ?? "left"],
  ]
  if (settings?.hasBorder) classes.push("border-y")
  return classes.join(" ")
}
