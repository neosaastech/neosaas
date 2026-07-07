"use client"

import * as React from "react"
import { Cookie, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"

interface CookieConsentPreviewProps {
  logo?: string | null
  showLogo: boolean
  message?: string
  siteName?: string
  isOpen?: boolean
  position?: "bottom-left" | "bottom-right"
}

export function CookieConsentPreview({ 
  logo, 
  showLogo, 
  message, 
  siteName = "NeoSaaS",
  isOpen = true,
  position = "bottom-left"
}: CookieConsentPreviewProps) {
  
  const displayMessage = message 
    ? message.replace(/{site_name}/g, siteName)
    : `We use cookies to ensure you get the best experience on our website.`

  return (
    <div className="relative w-full h-[400px] bg-muted/10 rounded-lg border border-dashed flex p-8 overflow-hidden">
      {/* Label for the preview */}
      <div className="absolute top-2 left-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-background/80 px-2 py-1 rounded border">
        Live Preview ({position})
      </div>

      <div
        className={cn(
          "absolute w-full max-w-sm transition-all duration-700 ease-out transform",
          position === "bottom-left" ? "bottom-8 left-8" : "bottom-8 right-8",
          isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-50 grayscale"
        )}
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-background/80 p-6 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 dark:border-white/10 dark:bg-black/40">
          {/* Decorative gradient blob */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          
          <div className="relative flex flex-col gap-4">
            <div className="flex items-start gap-4">
              {showLogo && (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 overflow-hidden">
                  {logo ? (
                    <Image 
                      src={logo} 
                      alt="Site Logo" 
                      width={32} 
                      height={32} 
                      className="h-8 w-8 object-contain" 
                    />
                  ) : (
                    <Cookie className="h-6 w-6" />
                  )}
                </div>
              )}
              <div className="space-y-1">
                <h3 className="font-semibold leading-none tracking-tight">Cookie Preferences</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {displayMessage}
                  <span className="ml-1 font-medium text-primary hover:underline cursor-pointer">
                    Learn more
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary" 
                size="sm"
              >
                Decline
              </Button>
              <Button 
                className="flex-1 rounded-full shadow-lg shadow-primary/20" 
                size="sm"
              >
                Accept
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full text-muted-foreground transition-opacity hover:bg-transparent hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
