"use client"

import Image from "next/image"
import { usePlatformConfig } from "@/contexts/platform-config-context"

interface BrandIconProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function BrandIcon({ size = "md", className = "" }: BrandIconProps) {
  const { siteName, logo } = usePlatformConfig()

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }

  // Default fallback logo
  const logoSrc = logo || "/images/logo_neolux.jpg"

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <Image src={logoSrc} alt={siteName} fill className="object-contain rounded" />
    </div>
  )
}
