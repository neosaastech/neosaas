import * as React from "react"
import { Badge } from "@/components/ui/badge"
import type { LucideIcon } from "lucide-react"

export interface StatusConfig {
  label: string
  icon: LucideIcon
  className: string
}

interface StatusBadgeProps {
  config: StatusConfig
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  animated?: boolean
}

export function StatusBadge({ 
  config, 
  size = "md", 
  onClick, 
  animated = false 
}: StatusBadgeProps) {
  const Icon = config.icon
  
  const sizeClasses = {
    sm: "text-xs py-0.5 px-2",
    md: "text-sm py-1 px-2.5",
    lg: "text-base py-1.5 px-3"
  }
  
  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4"
  }

  return (
    <Badge 
      variant="outline" 
      className={`
        ${config.className} 
        ${sizeClasses[size]}
        ${onClick ? "cursor-pointer" : ""}
        ${animated ? "transition-all hover:scale-105" : ""}
      `}
      onClick={onClick}
    >
      <Icon className={`${iconSizes[size]} mr-1.5`} />
      {config.label}
    </Badge>
  )
}
