import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Check, ChevronRight, Globe, Shield, Zap } from "lucide-react"
import { Users, CreditCard, BarChart4, Star } from "lucide-react"
import { BrandIcon } from "@/components/brand-icon"
import { NeoSaasArchitectureDiagram } from "@/components/neosaas-architecture-diagram"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background to-muted">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <Badge className="inline-flex bg-[#CD7F32] text-white">New Features Available</Badge>
                <div className="flex items-center gap-2 mb-4">
                  <BrandIcon size="lg" />
                  <h1 className="text-3xl font-bold tracking-tighter">
                    <span className="text-foreground">Neo</span>
                    <span className="text-[#CD7F32]">SaaS</span>
                  </h1>
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  The Complete SaaS Platform for Modern Businesses
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  NeoSaaS provides all the tools you need to build, launch, and scale your SaaS business. Start your
                  journey today.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/auth/register">
                  <Button size="lg" className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">
                    Get Started <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/features">
                  <Button size="lg" variant="outline">
                    Explore Features
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-[500px] h-[400px] rounded-lg overflow-hidden bg-gradient-to-br from-[#CD7F32]/10 to-background border border-[#CD7F32]/20 shadow-xl">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-4 p-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-16 w-16 rounded-full bg-[#CD7F32]/20 flex items-center justify-center">
                        <Users className="h-8 w-8 text-[#CD7F32]" />
                      </div>
                      <span className="text-xs text-muted-foreground">Users</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-16 w-16 rounded-full bg-[#CD7F32]/20 flex items-center justify-center">
                        <Shield className="h-8 w-8 text-[#CD7F32]" />
                      </div>
                      <span className="text-xs text-muted-foreground">Security</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-16 w-16 rounded-full bg-[#CD7F32]/20 flex items-center justify-center">
                        <Globe className="h-8 w-8 text-[#CD7F32]" />
                      </div>
                      <span className="text-xs text-muted-foreground">Global</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-16 w-16 rounded-full bg-[#CD7F32]/20 flex items-center justify-center">
                        <CreditCard className="h-8 w-8 text-[#CD7F32]" />
                      </div>
                      <span className="text-xs text-muted-foreground">Billing</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-20 w-20 rounded-full bg-[#CD7F32] flex items-center justify-center shadow-lg shadow-[#CD7F32]/50">
                        <Zap className="h-10 w-10 text-white" />
                      </div>
                      <span className="text-xs font-bold text-[#CD7F32]">NeoSaaS</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-16 w-16 rounded-full bg-[#CD7F32]/20 flex items-center justify-center">
                        <BarChart4 className="h-8 w-8 text-[#CD7F32]" />
                      </div>
                      <span className="text-xs text-muted-foreground">Analytics</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
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
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CD7F32]/10 text-[#CD7F32]">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">User Management</h3>
                  <p className="text-muted-foreground">
                    Comprehensive user management with roles, permissions, and team collaboration.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CD7F32]/10 text-[#CD7F32]">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Billing & Subscriptions</h3>
                  <p className="text-muted-foreground">
                    Flexible billing options with support for multiple payment providers.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CD7F32]/10 text-[#CD7F32]">
                    <BarChart4 className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Analytics & Reporting</h3>
                  <p className="text-muted-foreground">
                    Powerful analytics to track user behavior and business metrics.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CD7F32]/10 text-[#CD7F32]">
                    <Globe className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Multi-region Support</h3>
                  <p className="text-muted-foreground">
                    Deploy your application globally with multi-region support and CDN integration.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CD7F32]/10 text-[#CD7F32]">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Security & Compliance</h3>
                  <p className="text-muted-foreground">
                    Enterprise-grade security features to protect your data and meet compliance requirements.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CD7F32]/10 text-[#CD7F32]">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">API Integration</h3>
                  <p className="text-muted-foreground">
                    Powerful API integration capabilities to connect with your existing tools and services.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <Badge className="bg-[#CD7F32] text-white">Technology Stack</Badge>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Built with Modern Technologies</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl">
                NeoSaaS leverages the best technologies to deliver a robust, scalable, and secure platform.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4 mt-12 items-center">
            <Card className="flex items-center justify-center p-6 h-32 bg-background hover:shadow-lg transition-shadow">
              <Image
                src="/images/design-mode/OIP.mJ5m2pvYDrgXgQV26fLoDQHaGp.webp"
                alt="Next.js"
                width={120}
                height={60}
                className="object-contain"
              />
            </Card>
            <Card className="flex items-center justify-center p-6 h-32 bg-background hover:shadow-lg transition-shadow">
              <Image
                src="/images/design-mode/OIP.2qv4I5DCIN_XE8cT6M_sFQAAAA.webp"
                alt="Prisma"
                width={120}
                height={60}
                className="object-contain"
              />
            </Card>
            <Card className="flex items-center justify-center p-6 h-32 bg-background hover:shadow-lg transition-shadow">
              <Image
                src="/images/design-mode/OIP.rMNgqM_B76VzXugyzHZt0QHaEB.webp"
                alt="Neon Serverless Postgres"
                width={140}
                height={60}
                className="object-contain"
              />
            </Card>
            <Card className="flex items-center justify-center p-6 h-32 bg-background hover:shadow-lg transition-shadow">
              <Image
                src="/images/design-mode/OIP.NZCHYfcUrSHlM7-QtwCwWAHaHa.webp"
                alt="Better Auth"
                width={120}
                height={60}
                className="object-contain"
              />
            </Card>
            <Card className="flex items-center justify-center p-6 h-32 bg-background hover:shadow-lg transition-shadow">
              <Image
                src="/images/design-mode/OIP.dVVJ2i1BrGFxU5GBBuzyPAHaHa.webp"
                alt="Resend"
                width={120}
                height={60}
                className="object-contain"
              />
            </Card>
            <Card className="flex items-center justify-center p-6 h-32 bg-background hover:shadow-lg transition-shadow">
              <Image
                src="/images/design-mode/OIP.YorcsMZ-6bBZtrx_g494ZwHaEK.webp"
                alt="Stripe"
                width={120}
                height={60}
                className="object-contain"
              />
            </Card>
            <Card className="flex items-center justify-center p-6 h-32 bg-background hover:shadow-lg transition-shadow">
              <Image
                src="/images/design-mode/OIP.h3_xyxCdva0e9rRTncAzjgHaHa.webp"
                alt="PayPal"
                width={120}
                height={60}
                className="object-contain"
              />
            </Card>
            <Card className="flex items-center justify-center p-6 h-32 bg-background hover:shadow-lg transition-shadow">
              <Image
                src="/images/design-mode/OIP.k8AS-V_kTYFYl4SCg4HjggAAAA.webp"
                alt="TailAdmin"
                width={120}
                height={60}
                className="object-contain"
              />
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <Badge className="bg-[#CD7F32] text-white">Testimonials</Badge>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Trusted by Businesses Worldwide</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl">
                See what our customers have to say about NeoSaaS.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-[#CD7F32] text-[#CD7F32]" />
                    ))}
                  </div>
                  <p className="text-muted-foreground">
                    "NeoSaaS has transformed our business completely. The user management and billing features have
                    saved us countless hours of work."
                  </p>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/images/design-mode/44.jpg" alt="Jane Smith" />
                      <AvatarFallback>JS</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">Jane Smith</p>
                      <p className="text-xs text-muted-foreground">CEO, TechCorp</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-[#CD7F32] text-[#CD7F32]" />
                    ))}
                  </div>
                  <p className="text-muted-foreground">
                    "The analytics and reporting features have given us insights we never had before. We can now make
                    data-driven decisions with confidence."
                  </p>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/images/design-mode/32.jpg" alt="John Doe" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">John Doe</p>
                      <p className="text-xs text-muted-foreground">CTO, Innovate Inc.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-[#CD7F32] text-[#CD7F32]" />
                    ))}
                  </div>
                  <p className="text-muted-foreground">
                    "Setting up our subscription model was a breeze with NeoSaaS. The platform is intuitive and the
                    support team is always there when we need them."
                  </p>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/images/design-mode/68.jpg" alt="Sarah Johnson" />
                      <AvatarFallback>SJ</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">Sarah Johnson</p>
                      <p className="text-xs text-muted-foreground">Founder, StartUp Labs</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3 mb-4">
                <BrandIcon className="bg-white/10" />
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Ready to Get Started?</h2>
              </div>
              <p className="max-w-[600px] text-white/70 md:text-xl">
                Join thousands of businesses already growing with NeoSaaS. Start your 14-day free trial today.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Link href="/auth/register">
                <Button size="lg" className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-white border-white hover:bg-white/10 bg-transparent"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features List Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
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
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-[#CD7F32] mt-0.5" />
                  <div>
                    <h3 className="font-bold">Next.js 16 Framework</h3>
                    <p className="text-muted-foreground">
                      Built on the latest Next.js with React Server Components for optimal performance and developer
                      experience.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-[#CD7F32] mt-0.5" />
                  <div>
                    <h3 className="font-bold">Prisma ORM & Neon Database</h3>
                    <p className="text-muted-foreground">
                      Type-safe database access with Prisma and serverless PostgreSQL powered by Neon for scalability.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-[#CD7F32] mt-0.5" />
                  <div>
                    <h3 className="font-bold">Better Auth Integration</h3>
                    <p className="text-muted-foreground">
                      Modern authentication with Better Auth supporting multiple providers and advanced security
                      features.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-[#CD7F32] mt-0.5" />
                  <div>
                    <h3 className="font-bold">Resend Email API</h3>
                    <p className="text-muted-foreground">
                      Reliable transactional emails via Resend API with fallback to Nodemailer for SMTP support.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <NeoSaasArchitectureDiagram />
            </div>
          </div>
        </div>
      </section>

      {/* Project Structure Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl">Built for scale</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              NeoSaaS is designed with a modular architecture that allows you to scale each component independently. Our
              back office system provides a unified management interface while maintaining separation of concerns.
            </p>
          </div>

          <div className="mx-auto grid justify-center gap-4 md:max-w-[64rem] mt-8">
            {/* Project Structure Visualization */}
            <div className="relative overflow-hidden rounded-lg border bg-background p-2 max-w-2xl mx-auto">
              <div className="flex h-full flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">Project Structure</h3>
                  <p className="text-sm text-muted-foreground">
                    Clean and organized folder structure following Next.js best practices with Better Auth integration.
                  </p>
                </div>
                <div className="mt-4 rounded-md bg-muted p-4 overflow-x-auto">
                  <pre className="text-xs text-left">
                    {`src
├── app
│   ├── (auth)
│   │   ├── layout.tsx
│   │   ├── sign-in
│   │   │   └── page.tsx
│   │   └── sign-up
│   │       └── page.tsx
│   ├── (protected)
│   │   ├── dashboard
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api
│   │   └── auth
│   │       └── [...all]
│   │           └── route.ts
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components
│   ├── forms
│   │   ├── sign-in-form.tsx
│   │   └── sign-up-form.tsx
│   └── ui
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── config
└── lib
    ├── auth-client.ts
    ├── auth.ts
    └── prisma.ts`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
