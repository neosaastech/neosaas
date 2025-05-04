import { MobileMenu } from "@/components/mobile-menu"
import { HomeHero } from "@/components/sections/home/hero"
import { HomeFeatures } from "@/components/sections/home/features"
import { HomeTestimonials } from "@/components/sections/home/testimonials"
import { HomeCTA } from "@/components/sections/home/cta"
import { HomeFeaturesDetail } from "@/components/sections/home/features-list"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Add mobile menu button at the top right corner */}
      <div className="fixed top-4 right-4 z-50 md:hidden">
        <MobileMenu />
      </div>

      {/* Page sections */}
      <HomeHero />
      <HomeFeatures />
      <HomeTestimonials />
      <HomeCTA />
      <HomeFeaturesDetail />
    </div>
  )
}
