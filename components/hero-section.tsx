"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

export function HeroSection() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section className="relative overflow-hidden bg-white py-24 md:py-32">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-[#262626] md:text-5xl lg:text-6xl">
            {t.hero.title}
          </h1>
          <p className="mt-6 text-pretty text-xl text-[#4A4A4A] md:text-2xl leading-relaxed">{t.hero.subtitle}</p>
          <div className="mt-10">
            <Button
              asChild
              size="lg"
              className="bg-[#32AFB1] hover:bg-[#2A9B9D] text-white font-bold px-8 py-6 text-lg rounded transition-colors"
            >
              <Link href="#contact">{t.hero.cta}</Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, #32AFB1 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>
    </section>
  )
}
