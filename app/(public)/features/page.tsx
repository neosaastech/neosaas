import { and, asc, eq } from "drizzle-orm"
import { db } from "@/db"
import { pageLayers } from "@/db/schema"
import { layerRegistry } from "@/lib/layers/registry"
import { HeroLayer } from "@/components/layers/hero-layer"
import { FeatureGridLayer } from "@/components/layers/feature-grid-layer"

export const metadata = {
  title: "Features",
  description: "Discover all the features NeoSaaS offers: user management, billing & subscriptions, analytics, email management, file storage, and more.",
  keywords: ["features", "user management", "billing", "analytics", "email", "storage", "security"],
}

// Static fallback for a fresh clone whose DB hasn't run `pnpm seed:page-layers` yet
// (or where the seed step failed non-blockingly during build) — content identical
// to the seeded /features layers below.
function StaticFallback() {
  return (
    <>
      <HeroLayer
        title="Everything you need to run your SaaS"
        subtitle="NeoSaaS provides all the tools and features you need to build, launch, and scale your SaaS business."
      />
      <FeatureGridLayer
        items={[
          { icon: "Users", title: "User Management", description: "Comprehensive user management with roles, permissions, and team collaboration.", bullets: ["Role-based access control", "Team management", "User onboarding flows", "Profile management"] },
          { icon: "CreditCard", title: "Billing & Subscriptions", description: "Flexible billing options with support for multiple payment providers.", bullets: ["Subscription management", "Multiple payment methods", "Usage-based billing", "Invoicing and receipts"] },
          { icon: "BarChart4", title: "Analytics & Reporting", description: "Powerful analytics to track user behavior and business metrics.", bullets: ["User engagement metrics", "Revenue analytics", "Custom dashboards", "Export capabilities"] },
          { icon: "Mail", title: "Email Management", description: "Comprehensive email tools for marketing, transactional, and notification emails.", bullets: ["Email templates", "Campaign management", "Automated workflows", "Delivery analytics"] },
          { icon: "HardDrive", title: "File Storage", description: "Secure file storage and management for your application data.", bullets: ["Cloud storage integration", "File organization", "Access controls", "Version history"] },
          { icon: "Shield", title: "Security & Compliance", description: "Enterprise-grade security features to protect your data.", bullets: ["Two-factor authentication", "Data encryption", "GDPR compliance tools", "Security auditing"] },
          { icon: "FileText", title: "Documentation", description: "Comprehensive documentation for users and developers.", bullets: ["User guides", "API documentation", "Integration tutorials", "Knowledge base"] },
          { icon: "Clock", title: "Task Scheduler", description: "Automate recurring tasks and background processes.", bullets: ["Scheduled jobs", "Recurring tasks", "Workflow automation", "Execution history"] },
        ]}
      />
    </>
  )
}

export default async function FeaturesPage() {
  let layers: { id: string; layerType: string; props: unknown }[] = []
  try {
    layers = await db.query.pageLayers.findMany({
      where: and(eq(pageLayers.pagePath, "/features"), eq(pageLayers.isActive, true)),
      orderBy: asc(pageLayers.position),
    })
  } catch (error) {
    console.error("Failed to load /features page layers:", error)
  }

  return (
    <div className="container py-12 md:py-24">
      {layers.length === 0 ? (
        <StaticFallback />
      ) : (
        layers.map((layer) => {
          const def = layerRegistry[layer.layerType]
          if (!def) {
            console.error(`Unknown layerType "${layer.layerType}" for /features`)
            return null
          }
          const props = def.propsSchema.parse(layer.props)
          const Component = def.component
          return <Component key={layer.id} {...props} />
        })
      )}
    </div>
  )
}
