"use client"

import { Search, Lightbulb, Code, Rocket } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

export function MethodSection() {
  const { language } = useLanguage()
  const t = translations[language]

  const steps = [
    {
      icon: Search,
      number: "01",
      title: t.method.step1Title,
      description: t.method.step1Desc,
    },
    {
      icon: Lightbulb,
      number: "02",
      title: t.method.step2Title,
      description: t.method.step2Desc,
    },
    {
      icon: Code,
      number: "03",
      title: t.method.step3Title,
      description: t.method.step3Desc,
    },
    {
      icon: Rocket,
      number: "04",
      title: t.method.step4Title,
      description: t.method.step4Desc,
    },
  ]

  return (
    <section id="method" className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold text-[#32AFB1] text-center mb-4 md:text-4xl">{t.method.title}</h2>
          <p className="text-center text-[#4A4A4A] mb-16 max-w-2xl mx-auto">{t.method.subtitle}</p>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#32AFB1] flex items-center justify-center mb-4">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-4xl font-bold text-[#32AFB1]/20 mb-2">{step.number}</div>
                  <h3 className="font-semibold text-[#262626] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#4A4A4A] leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-[#D8D8D8]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
