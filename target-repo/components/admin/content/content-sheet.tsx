"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

/**
 * Shared editing overlay (Charles, 2026-07-05): edit-in-a-drawer instead of
 * navigating to a full separate page — slides up from the bottom and fills
 * at least half the viewport on desktop, slides in from the right on
 * mobile (a bottom sheet at phone width would fight the on-screen
 * keyboard). Used by Categories, Pages, and Articles editing alike so the
 * interaction is identical across the whole Content Hub, not one pattern
 * per content type.
 */
export function ContentSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "right" : "bottom"}
        className={cn(
          "flex flex-col overflow-y-auto",
          !isMobile && "h-[65vh] max-h-[85vh] sm:max-w-none",
          isMobile && "w-full sm:max-w-none",
        )}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-2">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
