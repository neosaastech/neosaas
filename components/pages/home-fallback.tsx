import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronRight } from "lucide-react"
import { BrandIcon } from "@/components/features/brand/brand-icon"
import { NeoSaasArchitectureDiagram } from "@/components/features/brand/neosaas-architecture-diagram"
import { HeroLayer } from "@/components/layers/hero-layer"
import { FeatureGridLayer } from "@/components/layers/feature-grid-layer"
import { TestimonialsLayer } from "@/components/layers/testimonials-layer"
import { HOME_FEATURE_ITEMS, HOME_TESTIMONIALS } from "@/lib/pages/home-content"

export function HomeFallback({ locale }: { locale: string }) {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="w-full">
        <HeroLayer
            eyebrow="New Features Available"
            title="The Complete SaaS Platform for Modern Businesses"
            subtitle="NeoSaaS provides all the tools you need to build, launch, and scale your SaaS business. Start your journey today."
            ctaLabel="Get Started"
            ctaHref="/auth/register"
            secondaryCtaLabel="View Pricing"
          secondaryCtaHref={`/${locale}/pricing`}
        />
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <FeatureGridLayer
            eyebrow="Core Features"
            title="Everything You Need"
            items={HOME_FEATURE_ITEMS}
          />
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Badge className="bg-brand text-white">Technology Stack</Badge>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Built with Modern Technologies</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl">
              NeoSaaS leverages the best technologies to deliver a robust, scalable, and secure platform.
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4 mt-12 items-center">
            {[
              { src: "/images/design-mode/OIP.mJ5m2pvYDrgXgQV26fLoDQHaGp.webp", alt: "Next.js" },
              { src: "/images/drizzle-logo.webp", alt: "Drizzle ORM" },
              { src: "/images/design-mode/OIP.rMNgqM_B76VzXugyzHZt0QHaEB.webp", alt: "Neon Serverless Postgres" },
              { src: "/images/design-mode/OIP.dVVJ2i1BrGFxU5GBBuzyPAHaHa.webp", alt: "Resend" },
              { src: "/images/amazon-ses-logo.webp", alt: "Amazon SES" },
              { src: "/images/lago-logo.webp", alt: "Lago Billing" },
              { src: "/images/design-mode/OIP.k8AS-V_kTYFYl4SCg4HjggAAAA.webp", alt: "TailAdmin" },
            ].map((logo) => (
              <div key={logo.alt} className="flex items-center justify-center p-6 h-32 bg-background rounded-lg border hover:shadow-lg transition-shadow">
                <Image src={logo.src} alt={logo.alt} width={120} height={60} className="object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container px-4 md:px-6">
          <TestimonialsLayer
            eyebrow="Testimonials"
            title="Trusted by Businesses Worldwide"
            items={HOME_TESTIMONIALS}
          />
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-[#1A1A1A] text-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BrandIcon className="bg-white/10" />
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Ready to Get Started?</h2>
            </div>
            <p className="max-w-[600px] text-white/70 md:text-xl">
              Join thousands of businesses already growing with NeoSaaS. Start your 14-day free trial today.
            </p>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Link href="/auth/register">
                <Button size="lg" className="bg-brand hover:bg-[#B26B27] text-white">
                  Start Free Trial <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/${locale}/pricing`}>
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 bg-transparent">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-4">
              <Badge className="bg-brand text-white w-fit">Why Choose NeoSaaS</Badge>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Built for Scale</h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                NeoSaaS is designed to grow with your business, from your first customer to your millionth.
              </p>
              <div className="space-y-4">
                {[
                  { title: "Next.js 16 Framework", desc: "Built on the latest Next.js with React Server Components for optimal performance." },
                  { title: "Drizzle ORM & Neon Database", desc: "Type-safe database access with serverless PostgreSQL powered by Neon." },
                  { title: "JWT Authentication", desc: "Secure authentication with roles, permissions, and multi-tenant support." },
                  { title: "Resend & Amazon SES", desc: "Reliable transactional emails with flexible configuration options." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <NeoSaasArchitectureDiagram />
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-24 lg:py-32">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl">Built for scale</h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            NeoSaaS is designed with a modular architecture that allows you to scale each component independently.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 md:max-w-[64rem] mt-8">
          <div className="relative overflow-hidden rounded-lg border bg-background p-2 max-w-2xl mx-auto">
            <div className="flex h-full flex-col justify-between rounded-md p-6">
              <div className="space-y-2">
                <h3 className="font-bold">Project Structure</h3>
                <p className="text-sm text-muted-foreground">Clean folder structure following Next.js best practices.</p>
              </div>
              <div className="mt-4 rounded-md bg-muted p-4 overflow-x-auto">
                <pre className="text-xs text-left">{`app/
├── (public)/page.tsx
├── (private)/dashboard/
├── (private)/admin/
├── auth/
└── api/
components/
├── layers/       # Page blocks
├── ui/           # shadcn primitives
└── layout/       # Header, footer
lib/
├── layers/       # Block registry
└── config/`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
