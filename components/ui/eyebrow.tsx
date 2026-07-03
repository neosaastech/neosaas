import { cn } from "@/lib/utils"

/**
 * Small bracketed label shown above a section's title (e.g. "[ PRICING ]").
 * Shared across page-builder blocks so every section-intro looks the same —
 * see components/layers/*.tsx's optional `eyebrow` prop.
 */
export function Eyebrow({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn("font-mono text-xs font-medium uppercase tracking-widest text-primary", className)}>
      [ {children} ]
    </p>
  )
}
