"use client"

import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail } from "lucide-react"

export default function RGPDPage() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-[#262626] mb-8">{t.rgpd.title}</h1>

            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-[#4A4A4A] leading-relaxed mb-8">{t.rgpd.intro}</p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[#262626] mb-4">{t.rgpd.dataControllerTitle}</h2>
                <p className="text-[#4A4A4A] leading-relaxed">{t.rgpd.dataControllerText}</p>
                <div className="mt-2 flex items-center gap-2 text-[#4A4A4A]">
                  <Mail className="w-4 h-4 text-[#32AFB1]" />
                  <a href="mailto:vandendriesschecharles@gmail.com" className="text-[#32AFB1] hover:underline">
                    vandendriesschecharles@gmail.com
                  </a>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[#262626] mb-4">{t.rgpd.dataCollectedTitle}</h2>
                <p className="text-[#4A4A4A] leading-relaxed">{t.rgpd.dataCollectedText}</p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[#262626] mb-4">{t.rgpd.purposeTitle}</h2>
                <p className="text-[#4A4A4A] leading-relaxed">{t.rgpd.purposeText}</p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[#262626] mb-4">{t.rgpd.dataRetentionTitle}</h2>
                <p className="text-[#4A4A4A] leading-relaxed">{t.rgpd.dataRetentionText}</p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[#262626] mb-4">{t.rgpd.rightsTitle}</h2>
                <p className="text-[#4A4A4A] leading-relaxed mb-2">{t.rgpd.rightsText}</p>
                <div className="flex items-center gap-2 text-[#4A4A4A]">
                  <Mail className="w-4 h-4 text-[#32AFB1]" />
                  <a href="mailto:vandendriesschecharles@gmail.com" className="text-[#32AFB1] hover:underline">
                    vandendriesschecharles@gmail.com
                  </a>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[#262626] mb-4">{t.rgpd.securityTitle}</h2>
                <p className="text-[#4A4A4A] leading-relaxed">{t.rgpd.securityText}</p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-[#262626] mb-4">{t.rgpd.cookiesTitle}</h2>
                <p className="text-[#4A4A4A] leading-relaxed">{t.rgpd.cookiesText}</p>
              </section>

              <section className="mb-8 p-6 bg-[#F5F5F5] rounded-lg border-l-4 border-[#32AFB1]">
                <h2 className="text-2xl font-semibold text-[#262626] mb-4">{t.rgpd.contactTitle}</h2>
                <p className="text-[#4A4A4A] leading-relaxed mb-2">{t.rgpd.contactText}</p>
                <div className="flex items-center gap-2 text-[#4A4A4A]">
                  <Mail className="w-4 h-4 text-[#32AFB1]" />
                  <a
                    href="mailto:vandendriesschecharles@gmail.com"
                    className="text-[#32AFB1] hover:underline font-medium"
                  >
                    vandendriesschecharles@gmail.com
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
