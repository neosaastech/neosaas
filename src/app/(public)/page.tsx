import { Avatar } from "@/components/ui/avatar"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Check, ChevronRight, Globe, Shield, Zap } from "lucide-react"
import { Users, CreditCard, BarChart4, Star } from "lucide-react"
import { MobileMenu } from "@/components/mobile-menu"
import { BrandIcon } from "@/components/brand-icon"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Add mobile menu button at the top right corner */}
      <div className="fixed top-4 right-4 z-50 md:hidden">
        <MobileMenu />
      </div>

      {/* Rest of the page content remains the same */}
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background to-muted">
        <div className="container px-4 md:px-6">
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
              <div className="relative w-full max-w-[500px] h-[400px] rounded-lg overflow-hidden shadow-xl">
                <Image src="/clean-data-overview.png" alt="NeoSaaS Dashboard" fill className="object-cover" priority />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
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

      {/* Testimonials Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container px-4 md:px-6">
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
                    <div className="rounded-full bg-muted-foreground/10 p-1">
                      <Avatar className="h-8 w-8" />
                    </div>
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
                    <div className="rounded-full bg-muted-foreground/10 p-1">
                      <Avatar className="h-8 w-8" />
                    </div>
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
                    <div className="rounded-full bg-muted-foreground/10 p-1">
                      <Avatar className="h-8 w-8" />
                    </div>
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
        <div className="container px-4 md:px-6">
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
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features List Section */}
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
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-[#CD7F32] mt-0.5" />
                  <div>
                    <h3 className="font-bold">Scalable Infrastructure</h3>
                    <p className="text-muted-foreground">
                      Built on a modern, cloud-native architecture that scales automatically with your needs.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-[#CD7F32] mt-0.5" />
                  <div>
                    <h3 className="font-bold">Global Availability</h3>
                    <p className="text-muted-foreground">
                      Deploy your application in multiple regions for low-latency access worldwide.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-[#CD7F32] mt-0.5" />
                  <div>
                    <h3 className="font-bold">Enterprise-grade Security</h3>
                    <p className="text-muted-foreground">
                      Advanced security features including SSO, 2FA, and data encryption at rest and in transit.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-[#CD7F32] mt-0.5" />
                  <div>
                    <h3 className="font-bold">Flexible Pricing</h3>
                    <p className="text-muted-foreground">
                      Create custom pricing plans that grow with your business and adapt to your customers' needs.
                    </p>
                  </div>
                </div>
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
    </div>
  )
}
