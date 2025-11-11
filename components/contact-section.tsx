"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/translations"

export function ContactSection() {
  const { language } = useLanguage()
  const t = translations[language]

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    needs: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    // Handle form submission
  }

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-semibold text-[#32AFB1] text-center mb-4 md:text-4xl">{t.contact.title}</h2>
          <p className="text-center text-[#4A4A4A] mb-12">{t.contact.subtitle}</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#262626] font-semibold">
                {t.contact.nameLabel}
              </Label>
              <Input
                id="name"
                type="text"
                placeholder={t.contact.namePlaceholder}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="border-[#D8D8D8] focus:border-[#32AFB1] focus:ring-[#32AFB1]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#262626] font-semibold">
                {t.contact.emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t.contact.emailPlaceholder}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="border-[#D8D8D8] focus:border-[#32AFB1] focus:ring-[#32AFB1]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-[#262626] font-semibold">
                {t.contact.companyLabel}
              </Label>
              <Input
                id="company"
                type="text"
                placeholder={t.contact.companyPlaceholder}
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="border-[#D8D8D8] focus:border-[#32AFB1] focus:ring-[#32AFB1]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="needs" className="text-[#262626] font-semibold">
                {t.contact.needsLabel}
              </Label>
              <Textarea
                id="needs"
                placeholder={t.contact.needsPlaceholder}
                value={formData.needs}
                onChange={(e) => setFormData({ ...formData, needs: e.target.value })}
                required
                rows={5}
                className="border-[#D8D8D8] focus:border-[#32AFB1] focus:ring-[#32AFB1]"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#32AFB1] hover:bg-[#2A9B9D] text-white font-bold py-6 text-lg rounded transition-colors"
            >
              {t.contact.submitButton}
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
