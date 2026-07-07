/**
 * Preline Marketing — icon grid showcase panel with optional image/video media.
 * @see https://www.preline.co/examples/features-general.html
 */
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"

export interface IconShowcaseItem {
  icon: string
  label: string
  highlighted?: boolean
}

export const DEFAULT_ICON_SHOWCASE_ITEMS: IconShowcaseItem[] = [
  { icon: "Users", label: "Users" },
  { icon: "Shield", label: "Security" },
  { icon: "Globe", label: "Global" },
  { icon: "CreditCard", label: "Billing" },
  { icon: "Zap", label: "NeoSaaS", highlighted: true },
  { icon: "BarChart4", label: "Analytics" },
]

export interface PrelineIconShowcasePanelProps {
  items?: IconShowcaseItem[]
  /** Background or full-bleed image (used as video poster when both are set). */
  imageUrl?: string
  /** Background or full-bleed video — takes priority over imageUrl. */
  videoUrl?: string
  /** When media is set, show the icon grid on top. Default: true. */
  overlayIcons?: boolean
  className?: string
}

function IconShowcaseGrid({ items }: { items: IconShowcaseItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 p-8">
      {items.map((item) => {
        const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[item.icon]
        const highlighted = item.highlighted === true

        return (
          <div key={`${item.icon}-${item.label}`} className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center rounded-full",
                highlighted
                  ? "h-20 w-20 bg-brand shadow-lg shadow-brand/50"
                  : "h-16 w-16 bg-brand/20",
              )}
            >
              {Icon ? (
                <Icon className={cn("text-brand", highlighted ? "h-10 w-10 text-white" : "h-8 w-8")} />
              ) : null}
            </div>
            <span
              className={cn(
                "text-xs text-muted-foreground",
                highlighted && "font-bold text-brand",
              )}
            >
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function PrelineIconShowcasePanel({
  items = DEFAULT_ICON_SHOWCASE_ITEMS,
  imageUrl,
  videoUrl,
  overlayIcons = true,
  className,
}: PrelineIconShowcasePanelProps) {
  const hasMedia = Boolean(videoUrl || imageUrl)
  const showIcons = items.length > 0 && (!hasMedia || overlayIcons)

  return (
    <div
      className={cn(
        "relative h-[400px] w-full max-w-[500px] overflow-hidden rounded-lg border border-brand/20 bg-gradient-to-br from-brand/10 to-background shadow-xl",
        className,
      )}
    >
      {videoUrl && (
        <video
          src={videoUrl}
          poster={imageUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {!videoUrl && imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {hasMedia && showIcons && (
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-background/20" />
      )}

      {showIcons && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div
            className={cn(
              hasMedia && overlayIcons && "rounded-xl bg-background/60 p-2 shadow-lg backdrop-blur-sm",
            )}
          >
            <IconShowcaseGrid items={items} />
          </div>
        </div>
      )}
    </div>
  )
}
