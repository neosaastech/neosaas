"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, BarChart3 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

export function UseCasesSection() {
  const { language } = useLanguage()
  const t = translations[language]

  const useCases = [
    {
      icon: Users,
      title: t.useCases.case1Title,
      description: t.useCases.case1Desc,
      color: "#32AFB1",
    },
    {
      icon: MessageSquare,
      title: t.useCases.case2Title,
      description: t.useCases.case2Desc,
      color: "#32AFB1",
    },
    {
      icon: BarChart3,
      title: t.useCases.case3Title,
      description: t.useCases.case3Desc,
      color: "#32AFB1",
    },
  ]

  return (
    <section id="use-cases" className="py-20 bg-[#F9F9F9]">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold text-[#32AFB1] text-center mb-4 md:text-4xl">{t.useCases.title}</h2>
          <p className="text-center text-[#4A4A4A] mb-12 max-w-2xl mx-auto">{t.useCases.subtitle}</p>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <Card
                key={index}
                className="border-l-4 hover:shadow-lg transition-shadow"
                style={{ borderLeftColor: useCase.color }}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-[#32AFB1]/10 flex items-center justify-center mb-4">
                    <useCase.icon className="w-6 h-6 text-[#32AFB1]" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-[#32AFB1]">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-[#4A4A4A] leading-relaxed">{useCase.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
