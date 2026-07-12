"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserCompanyAvatarProps {
  firstName?: string
  lastName?: string
  profileImage?: string | null
  companyLogo?: string | null
  companyName?: string | null
  size?: "sm" | "md"
  className?: string
}

export function UserCompanyAvatar({
  firstName = "",
  lastName = "",
  profileImage,
  companyLogo,
  companyName,
  size = "md",
  className,
}: UserCompanyAvatarProps) {
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "U"
  const avatarSize = size === "sm" ? "h-9 w-9" : "h-10 w-10"
  const badgeSize = size === "sm" ? "h-4 w-4" : "h-5 w-5"
  const badgeOffset = size === "sm" ? "-bottom-0.5 -right-0.5" : "-bottom-1 -right-1"

  return (
    <div className={cn("relative inline-flex", className)}>
      <Avatar className={cn(avatarSize, "border-2 border-brand/20")}>
        <AvatarImage
          src={profileImage || "/placeholder.svg?height=40&width=40"}
          alt={`${firstName} ${lastName}`.trim() || "User"}
        />
        <AvatarFallback className="bg-brand text-white font-semibold text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>

      {companyLogo && (
        <span
          className={cn(
            "absolute z-10 overflow-hidden rounded-full border-2 border-background bg-background shadow-xs",
            badgeSize,
            badgeOffset,
          )}
          title={companyName || "Company"}
        >
          <img src={companyLogo} alt={companyName || "Company logo"} className="h-full w-full object-cover" />
        </span>
      )}

      {!companyLogo && companyName && (
        <span
          className={cn(
            "absolute z-10 flex items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground shadow-xs",
            badgeSize,
            badgeOffset,
          )}
          title={companyName}
        >
          <Building2 className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
        </span>
      )}
    </div>
  )
}
