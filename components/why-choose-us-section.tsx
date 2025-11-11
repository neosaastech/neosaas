"use client"

import { CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

export function WhyChooseUsSection() {
  const { language } = useLanguage()
  const t = translations[language]

  const benefits = [
    {
      title: t.whyChoose.benefit1Title,
      description: t.whyChoose.benefit1Desc,
    },
    {
      title: t.whyChoose.benefit2Title,
      description: t.whyChoose.benefit2Desc,
    },
    {
      title: t.whyChoose.benefit3Title,
      description: t.whyChoose.benefit3Desc,
    },
    {
      title: t.whyChoose.benefit4Title,
      description: t.whyChoose.benefit4Desc,
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-semibold text-[#32AFB1] text-center mb-4 md:text-4xl">{t.whyChoose.title}</h2>
          <p className="text-center text-[#4A4A4A] mb-12 max-w-2xl mx-auto">{t.whyChoose.subtitle}</p>
          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 rounded-lg border border-[#D8D8D8] hover:border-[#32AFB1] transition-colors"
              >
                <CheckCircle2 className="w-6 h-6 text-[#32AFB1] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-[#262626] mb-2">{benefit.title}</h3>
                  <p className="text-sm text-[#4A4A4A]">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
