"use client"

import Link from "next/link"
import { Linkedin, Twitter, Github } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

export function Footer() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <footer className="bg-[#262626] text-white py-12">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-[#32AFB1] mb-4">NEOMNIA</h3>
            <p className="text-sm text-[#D8D8D8]">{t.footer.description}</p>
          </div>
          <div>
            <h3 className="font-semibold text-[#32AFB1] mb-4">{t.footer.legalTitle}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/legal" className="text-[#D8D8D8] hover:text-[#32AFB1] transition-colors">
                  {t.footer.legalNotices}
                </Link>
              </li>
              <li>
                <Link href="/rgpd" className="text-[#D8D8D8] hover:text-[#32AFB1] transition-colors">
                  {t.footer.rgpd}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[#D8D8D8] hover:text-[#32AFB1] transition-colors">
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[#D8D8D8] hover:text-[#32AFB1] transition-colors">
                  {t.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-[#32AFB1] mb-4">{t.footer.partnershipsTitle}</h3>
            <ul className="space-y-2 text-sm text-[#D8D8D8]">
              <li>{t.footer.partnership1}</li>
              <li>{t.footer.partnership2}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#4A4A4A] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#D8D8D8]">
            © {new Date().getFullYear()} NEOMNIA. {t.footer.copyright}
          </p>
          <div className="flex items-center gap-4">
            <Link href="https://linkedin.com" className="text-[#D8D8D8] hover:text-[#32AFB1] transition-colors">
              <Linkedin className="w-5 h-5" />
              <span className="sr-only">LinkedIn</span>
            </Link>
            <Link href="https://twitter.com" className="text-[#D8D8D8] hover:text-[#32AFB1] transition-colors">
              <Twitter className="w-5 h-5" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link href="https://github.com" className="text-[#D8D8D8] hover:text-[#32AFB1] transition-colors">
              <Github className="w-5 h-5" />
              <span className="sr-only">GitHub</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
