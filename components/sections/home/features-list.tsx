import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

export function HomeFeaturesDetail() {
  const features = [
    {
      title: "Scalable Infrastructure",
      description: "Built on a modern, cloud-native architecture that scales automatically with your needs.",
    },
    {
      title: "Global Availability",
      description: "Deploy your application in multiple regions for low-latency access worldwide.",
    },
    {
      title: "Enterprise-grade Security",
      description: "Advanced security features including SSO, 2FA, and data encryption at rest and in transit.",
    },
    {
      title: "Flexible Pricing",
      description: "Create custom pricing plans that grow with your business and adapt to your customers' needs.",
    },
  ]

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <Badge className="bg-[#CD7F32] text-white">Why Choose NeoSaaS</Badge>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Built for Scale</h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                NeoSaaS is designed to grow with your business, from your first customer to your millionth.
              </p>
            </div>
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-[#CD7F32] mt-0.5" />
                  <div>
                    <h3 className="font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-[500px] h-[400px] rounded-lg overflow-hidden shadow-xl">
              <Image src="/dashboard.jpg" alt="NeoSaaS Analytics" fill className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
