"use client"

import { Bot, Workflow, Zap } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

export function MissionSection() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="mission" className="py-20 bg-[#F9F9F9]">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold text-[#32AFB1] text-center mb-4 md:text-4xl">{t.mission.title}</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center mt-12">
            <div>
              <p className="text-base text-[#4A4A4A] leading-relaxed text-justify">{t.mission.paragraph1}</p>
              <p className="text-base text-[#4A4A4A] leading-relaxed text-justify mt-4">{t.mission.paragraph2}</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#32AFB1]/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-[#32AFB1]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#262626] mb-1">{t.mission.feature1Title}</h3>
                  <p className="text-sm text-[#4A4A4A]">{t.mission.feature1Desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#32AFB1]/10 flex items-center justify-center">
                  <Workflow className="w-6 h-6 text-[#32AFB1]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#262626] mb-1">{t.mission.feature2Title}</h3>
                  <p className="text-sm text-[#4A4A4A]">{t.mission.feature2Desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#32AFB1]/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#32AFB1]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#262626] mb-1">{t.mission.feature3Title}</h3>
                  <p className="text-sm text-[#4A4A4A]">{t.mission.feature3Desc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
