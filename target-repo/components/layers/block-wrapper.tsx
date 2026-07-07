import { cn } from "@/lib/utils"
import { blockSettingsSchema, resolveBlockSettingsClassName } from "@/lib/layers/block-settings"

/**
 * Converts a block's stored `blockSettings` (backgroundColor/padding/
 * textAlign/hasBorder) into Tailwind classes and wraps the layer's own JSX —
 * the layer component itself (HeroLayer, ContentLayer, ...) stays unaware
 * this exists, matching the split already established between content
 * (registry propsSchema) and presentation (this file).
 */
export function BlockWrapper({ settings, children }: { settings: unknown; children: React.ReactNode }) {
  const parsed = blockSettingsSchema.optional().safeParse(settings)
  const className = resolveBlockSettingsClassName(parsed.success ? parsed.data : undefined)
  return <section className={cn("w-full", className)}>{children}</section>
}
