import { z } from "zod"

/**
 * Generic per-block styling controls (Pilier C extension, 2026-07-05) —
 * mirrors payload-cms's src/blocks/shared/blockSettings.ts group field.
 * Deliberately kept separate from each layer's own propsSchema in
 * lib/layers/registry.ts: content vs. presentation stay two different
 * concerns, so a block's Props interface never needs to know these exist —
 * <BlockWrapper /> is the only thing that reads this shape.
 */
const spacingEnum = z.enum(["none", "small", "normal", "large"])

export const blockSettingsSchema = z.object({
  backgroundColor: z.enum(["white", "gray", "dark", "brand", "primary", "secondary", "accent"]).optional(),
  /** @deprecated superseded by paddingTop/paddingBottom (2026-07-06) — still read as a fallback for blocks published before that date, never written to by new saves. */
  padding: z.enum(["none", "normal", "large"]).optional(),
  paddingTop: spacingEnum.optional(),
  paddingBottom: spacingEnum.optional(),
  marginTop: spacingEnum.optional(),
  marginBottom: spacingEnum.optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  hasBorder: z.boolean().optional(),
  /** 'sticky', not 'fixed' — position:fixed is viewport-relative regardless
   * of its container and easily overlaps other content in an arbitrary
   * page-builder layout; sticky stays predictable (pins within its own
   * scroll context) — same reasoning as payload-cms's blockSettings.ts. */
  position: z.enum(["normal", "sticky"]).optional(),
})

export type BlockSettings = z.infer<typeof blockSettingsSchema>

const BACKGROUND_CLASSES: Record<NonNullable<BlockSettings["backgroundColor"]>, string> = {
  white: "bg-background",
  gray: "bg-muted",
  dark: "bg-slate-900 text-white",
  brand: "bg-brand text-white",
  // Added 2026-07-06 — tied to the tenant's own color palette (Tenants →
  // Marque in Payload, synced into theme_config's --primary/--secondary/
  // --accent), unlike `brand` above which is this boilerplate's separate,
  // static accent color.
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  accent: "bg-accent text-accent-foreground",
}

type Spacing = NonNullable<z.infer<typeof spacingEnum>>

const PADDING_TOP_CLASSES: Record<Spacing, string> = {
  none: "pt-0",
  small: "pt-6",
  normal: "pt-12 md:pt-16",
  large: "pt-24 md:pt-36",
}

const PADDING_BOTTOM_CLASSES: Record<Spacing, string> = {
  none: "pb-0",
  small: "pb-6",
  normal: "pb-12 md:pb-16",
  large: "pb-24 md:pb-36",
}

const MARGIN_TOP_CLASSES: Record<Spacing, string> = {
  none: "mt-0",
  small: "mt-6",
  normal: "mt-12 md:mt-16",
  large: "mt-24 md:mt-36",
}

const MARGIN_BOTTOM_CLASSES: Record<Spacing, string> = {
  none: "mb-0",
  small: "mb-6",
  normal: "mb-12 md:mb-16",
  large: "mb-24 md:mb-36",
}

const TEXT_ALIGN_CLASSES: Record<NonNullable<BlockSettings["textAlign"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const POSITION_CLASSES: Record<NonNullable<BlockSettings["position"]>, string> = {
  normal: "",
  sticky: "sticky top-0 z-30",
}

/** Turns a block's stored settings into the Tailwind classes `<BlockWrapper />` applies. */
export function resolveBlockSettingsClassName(settings: BlockSettings | undefined): string {
  // Legacy `padding` only ever stored "none" | "normal" | "large" — a valid
  // subset of the new 4-value scale, so it's a safe direct fallback key.
  const legacyPadding = settings?.padding ?? "normal"

  const classes = [
    BACKGROUND_CLASSES[settings?.backgroundColor ?? "white"],
    PADDING_TOP_CLASSES[settings?.paddingTop ?? legacyPadding],
    PADDING_BOTTOM_CLASSES[settings?.paddingBottom ?? legacyPadding],
    MARGIN_TOP_CLASSES[settings?.marginTop ?? "none"],
    MARGIN_BOTTOM_CLASSES[settings?.marginBottom ?? "none"],
    TEXT_ALIGN_CLASSES[settings?.textAlign ?? "left"],
    POSITION_CLASSES[settings?.position ?? "normal"],
  ]
  if (settings?.hasBorder) classes.push("border-y")
  return classes.join(" ")
}
