import Image from "next/image"

interface BrandIconProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function BrandIcon({ size = "md", className = "" }: BrandIconProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <Image src="/images/logo_neolux.jpg" alt="NeoSaaS" fill className="object-contain rounded" />
    </div>
  )
}
