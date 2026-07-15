"use client"

import * as React from "react"
import { Cookie, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveCookieConsent } from "@/app/actions/cookie-consent"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { useLocale } from "@/lib/i18n/use-locale"
import { cookieConsentDictionary, resolveLegalLocale } from "@/lib/i18n/legal-dictionary"

interface CookieConsentProps {
  logo?: string | null
  enabled?: boolean
  /** Admin-authored custom message (French, the site's default language). */
  message?: string
  /** Optional English variant of the custom message above — see messageEn's use below. */
  messageEn?: string
  siteName?: string
  position?: "bottom-left" | "bottom-right"
}

export function CookieConsent({
  logo,
  enabled = true,
  message,
  messageEn,
  siteName = "NeoSaaS",
  position = "bottom-left"
}: CookieConsentProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hide, setHide] = React.useState(false)
  const locale = useLocale()
  const t = cookieConsentDictionary[resolveLegalLocale(locale)]

  React.useEffect(() => {
    // If explicitly disabled, ensure it's closed
    if (enabled === false) {
      setIsOpen(false)
      return
    }

    // Check local storage for existing consent
    const consent = localStorage.getItem("cookie-consent")
    
    // Only show if no consent has been given yet
    if (!consent) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [enabled])

  const accept = async () => {
    localStorage.setItem("cookie-consent", "accepted")
    setIsOpen(false)
    setTimeout(() => setHide(true), 300)
    await saveCookieConsent("accepted")
  }

  const decline = async () => {
    localStorage.setItem("cookie-consent", "declined")
    setIsOpen(false)
    setTimeout(() => setHide(true), 300)
    await saveCookieConsent("declined")
  }

  // If disabled via config, don't render anything
  if (enabled === false) return null
  
  // If hidden via user action (accept/decline), don't render
  if (hide) return null

  // A custom message is admin-authored free text (no automatic translation
  // possible) — `message` is the French/default field, `messageEn` its
  // optional English counterpart. Each locale only ever falls back to its
  // own dictionary default, never to the other locale's custom text
  // (Charles, 2026-07-15: "si on custom il faut prévoir les deux langues").
  const customMessage = resolveLegalLocale(locale) === "en" ? messageEn : message
  const displayMessage = customMessage ? customMessage.replace(/{site_name}/g, siteName) : t.defaultMessage

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "fixed z-50 w-full max-w-sm transition-all duration-700 ease-out",
        position === "bottom-right" ? "bottom-6 right-6" : "bottom-6 left-6",
        "translate-y-0 opacity-100",
      )}
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-background/80 p-6 shadow-2xl backdrop-blur-xl supports-backdrop-filter:bg-background/60 dark:border-white/10 dark:bg-black/40">
        {/* Decorative gradient blob */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start gap-4">
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
            <div className="space-y-1">
              <h3 className="font-semibold leading-none tracking-tight">{t.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayMessage}
                <Link href={`/${locale}/legal/privacy`} className="ml-1 font-medium text-primary hover:underline">
                  {t.learnMore}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary" 
              onClick={decline}
            >
              {t.decline}
            </Button>
            <Button
              className="flex-1 rounded-full shadow-lg shadow-primary/20"
              onClick={accept}
            >
              {t.accept}
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-transparent hover:text-foreground group-hover:opacity-100"
          onClick={decline}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </div>
  )
}
