import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, CreditCard, BarChart4, Globe, Shield, Zap } from "lucide-react"

export function HomeFeatures() {
  const featureItems = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "User Management",
      description: "Comprehensive user management with roles, permissions, and team collaboration.",
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Billing & Subscriptions",
      description: "Flexible billing options with support for multiple payment providers.",
    },
    {
      icon: <BarChart4 className="h-6 w-6" />,
      title: "Analytics & Reporting",
      description: "Powerful analytics to track user behavior and business metrics.",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Multi-region Support",
      description: "Deploy your application globally with multi-region support and CDN integration.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Security & Compliance",
      description: "Enterprise-grade security features to protect your data and meet compliance requirements.",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "API Integration",
      description: "Powerful API integration capabilities to connect with your existing tools and services.",
    },
  ]

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <Badge className="bg-[#CD7F32] text-white">Core Features</Badge>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Everything You Need</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl">
              NeoSaaS provides a comprehensive suite of tools to help you build, launch, and scale your SaaS business.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          {featureItems.map((feature, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CD7F32]/10 text-[#CD7F32]">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
