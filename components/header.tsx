"use client"

import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"

export function Header() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#D8D8D8] bg-white">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/neomnia-logo%2Brectangel%2Bnom-rm1OxRbOSvT76v7IdLZdnCtb3ACm8T.png"
            alt="NEOMNIA - Agentic AI & Data Studio"
            width={280}
            height={60}
            className="h-12 w-auto"
            priority
          />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#mission" className="text-[#262626] hover:text-[#32AFB1] font-semibold transition-colors">
            {t.nav.mission}
          </Link>
          <Link href="#use-cases" className="text-[#262626] hover:text-[#32AFB1] font-semibold transition-colors">
            {t.nav.useCases}
          </Link>
          <Link href="#method" className="text-[#262626] hover:text-[#32AFB1] font-semibold transition-colors">
            {t.nav.method}
          </Link>
          <Link href="#team" className="text-[#262626] hover:text-[#32AFB1] font-semibold transition-colors">
            {t.nav.team}
          </Link>
          <Link href="#contact" className="text-[#262626] hover:text-[#32AFB1] font-semibold transition-colors">
            {t.nav.contact}
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === "en" ? "fr" : "en")}
            className="border-[#32AFB1] text-[#32AFB1] hover:bg-[#32AFB1] hover:text-white transition-colors"
          >
            <Globe className="w-4 h-4 mr-2" />
            {language === "en" ? "FR" : "EN"}
          </Button>
        </nav>
      </div>
    </header>
  )
}
