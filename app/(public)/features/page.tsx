import { FeaturesHeader } from "@/components/sections/features/header"
import { FeatureGrid } from "@/components/sections/features/feature-grid"

export default function FeaturesPage() {
  return (
    <div className="container py-12 md:py-24">
      <FeaturesHeader />
      <FeatureGrid />
    </div>
  )
}
