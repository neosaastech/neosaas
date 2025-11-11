"use client"

import Image from "next/image"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

export function TeamSection() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="team" className="py-20 bg-[#F9F9F9]">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold text-[#32AFB1] text-center mb-4 md:text-4xl">{t.team.title}</h2>
          <p className="text-center text-[#4A4A4A] mb-12 max-w-2xl mx-auto">{t.team.subtitle}</p>
          <div className="flex justify-center">
            <div className="group max-w-xs">
              <div className="relative overflow-hidden rounded-full aspect-square mb-4 bg-[#D8D8D8]">
                <Image
                  src="/charles-vandendriessche.png"
                  alt={t.team.founderName}
                  fill
                  className="object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-[#32AFB1]/0 group-hover:bg-[#32AFB1]/20 transition-colors" />
              </div>
              <h3 className="font-semibold text-[#262626] text-center text-xl">{t.team.founderName}</h3>
              <p className="text-sm text-[#4A4A4A] text-center">{t.team.founderRole}</p>
              <p className="text-xs text-[#4A4A4A] text-center mt-2 italic">{t.team.founderNote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
