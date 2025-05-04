import { cn } from "@/lib/utils"

interface BrandIconProps {
  className?: string
  size?: "sm" | "md" | "lg"
  monogram?: boolean
}

export function BrandIcon({ className, size = "md", monogram = false }: BrandIconProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-base",
    md: "h-10 w-10 text-lg",
    lg: "h-12 w-12 text-xl",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[#CD7F32]/10 font-bold tracking-tight",
        sizeClasses[size],
        className,
      )}
    >
      {monogram ? (
        <>
          <span className="text-foreground">N</span>
          <span className="text-[#CD7F32]">S</span>
        </>
      ) : (
        <span className="text-[#CD7F32]">NS</span>
      )}
    </div>
  )
}
