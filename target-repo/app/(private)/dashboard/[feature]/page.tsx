import { notFound } from "next/navigation"
import { featureRegistry } from "@/lib/dashboard/feature-registry"
import { FeaturePage } from "@/components/dashboard/feature-page"

/**
 * Metadata-Driven UI catch-all — one route for every registered dashboard
 * feature (lib/dashboard/feature-registry.ts). Adding a feature means
 * adding a FeatureConfig entry, never a new page file.
 */
export default async function DynamicFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params
  const config = featureRegistry[feature]

  if (!config) {
    notFound()
  }

  return <FeaturePage config={config} />
}
