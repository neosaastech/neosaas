import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { MissionSection } from "@/components/mission-section"
import { WhyChooseUsSection } from "@/components/why-choose-us-section"
import { UseCasesSection } from "@/components/use-cases-section"
import { MethodSection } from "@/components/method-section"
import { TeamSection } from "@/components/team-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <MissionSection />
        <WhyChooseUsSection />
        <UseCasesSection />
        <MethodSection />
        <TeamSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
