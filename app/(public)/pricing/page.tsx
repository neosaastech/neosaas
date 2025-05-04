import { PricingHeader } from "@/components/sections/pricing/header"
import { PricingPlans } from "@/components/sections/pricing/pricing-plans"

export default function PricingPage() {
  return (
    <div className="container py-12 md:py-24">
      <PricingHeader />
      <PricingPlans />
    </div>
  )
}
