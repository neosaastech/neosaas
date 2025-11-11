"use client"

import Link from "next/link"
import { ArrowLeft, Mail, Globe } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function LegalPage() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#32AFB1] hover:text-[#262626] transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === "fr" ? "Retour à l'accueil" : "Back to home"}
            </Link>

            <h1 className="text-4xl font-bold text-[#262626] mb-8">{t.legal.title}</h1>

            <div className="space-y-8">
              {/* Publisher Section */}
              <section>
                <h2 className="text-2xl font-semibold text-[#32AFB1] mb-4">{t.legal.publisherTitle}</h2>
                <div className="bg-[#F9F9F9] p-6 rounded-lg space-y-3">
                  <p className="text-[#262626]">
                    <strong>NEOMNIA</strong> - Agentic AI & Data Studio
                  </p>
                  <p className="text-[#4A4A4A]">{t.legal.publisherName}</p>
                  <p className="text-[#4A4A4A] italic">{t.legal.publisherStatus}</p>
                  <div className="flex items-center gap-2 text-[#4A4A4A]">
                    <Mail className="w-4 h-4 text-[#32AFB1]" />
                    <span className="font-medium">{t.legal.publisherEmail}:</span>
                    <a href="mailto:vandendriesschecharles@gmail.com" className="text-[#32AFB1] hover:underline">
                      vandendriesschecharles@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-[#4A4A4A]">
                    <Globe className="w-4 h-4 text-[#32AFB1]" />
                    <span className="font-medium">{t.legal.publisherWebsite}:</span>
                    <a
                      href="https://www.charles-vandendriessche.fr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#32AFB1] hover:underline"
                    >
                      www.charles-vandendriessche.fr
                    </a>
                  </div>
                </div>
              </section>

              {/* Hosting Section */}
              <section>
                <h2 className="text-2xl font-semibold text-[#32AFB1] mb-4">{t.legal.hostingTitle}</h2>
                <div className="bg-[#F9F9F9] p-6 rounded-lg">
                  <p className="text-[#4A4A4A] mb-3">{t.legal.hostingProvider}</p>
                  <a
                    href="https://www.ionos.fr"
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#32AFB1] hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    {t.legal.hostingLink}
                  </a>
                </div>
              </section>

              {/* Personal Data Section */}
              <section>
                <h2 className="text-2xl font-semibold text-[#32AFB1] mb-4">{t.legal.dataTitle}</h2>
                <div className="bg-[#F9F9F9] p-6 rounded-lg">
                  <p className="text-[#4A4A4A] leading-relaxed">{t.legal.dataText}</p>
                </div>
              </section>

              {/* Intellectual Property Section */}
              <section>
                <h2 className="text-2xl font-semibold text-[#32AFB1] mb-4">{t.legal.intellectualTitle}</h2>
                <div className="bg-[#F9F9F9] p-6 rounded-lg">
                  <p className="text-[#4A4A4A] leading-relaxed">{t.legal.intellectualText}</p>
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
