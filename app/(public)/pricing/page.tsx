import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Download, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function PricingPage() {
  return (
    <div className="container py-12 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Let our experts help you</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the plan that fits your needs or download NeoSaaS for free to get started on your own.
        </p>
      </div>

      <div className="mx-auto max-w-4xl mt-12">
        <Card className="bg-gradient-to-br from-[#CD7F32]/10 to-background border-[#CD7F32]/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#CD7F32]/20 flex items-center justify-center">
                  <Download className="h-6 w-6 text-[#CD7F32]" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Download NeoSaaS for Free</CardTitle>
                  <CardDescription className="mt-1">
                    Get the complete source code and deploy it yourself
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-[#CD7F32] text-white">FREE</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              NeoSaaS is open-source and available for free download. Deploy on your own infrastructure using Docker,
              Node.js, or your preferred hosting provider.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/docs" className="w-full">
              <Button size="lg" className="w-full bg-[#CD7F32] hover:bg-[#B26B27]">
                <Download className="mr-2 h-5 w-5" />
                Download & Documentation
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="mx-auto mt-16 grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-4">
        {/* Starter Plan */}
        <Card className="flex flex-col border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Starter</CardTitle>
            <CardDescription className="mt-2">Ideal for solo devs or small teams</CardDescription>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$199</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Info className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <Link href="/legacy/contact" className="w-full">
              <Button className="w-full bg-transparent" variant="outline">
                Get started
              </Button>
            </Link>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Possible focus areas:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>2-hours live walkthrough</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Docker setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>CLI usage & deployment</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Environment configuration</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-semibold">You'll receive:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Setup notes and checklist</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="flex flex-col border-2 border-[#22C55E] relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <Badge className="bg-[#22C55E] text-white">Most popular</Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">Pro</CardTitle>
            <CardDescription className="mt-2">Perfect for teams building core modules</CardDescription>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$699</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Info className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <Link href="/legacy/contact" className="w-full">
              <Button className="w-full bg-[#22C55E] hover:bg-[#22C55E]/90">Get started</Button>
            </Link>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Potential session topics:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>In-depth onboarding</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>AWS & CDK walkthrough</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Branching strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Stripe/ CMS setup</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-semibold">You'll receive:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Recorded sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Setup documentation</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Enterprise Plan */}
        <Card className="flex flex-col border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Enterprise</CardTitle>
            <CardDescription className="mt-2">Designed for full production SaaS</CardDescription>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$2,999</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Info className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <Link href="/legacy/contact" className="w-full">
              <Button className="w-full bg-transparent" variant="outline">
                Get started
              </Button>
            </Link>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Areas we could address:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Architecture review</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Advanced customization</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>CI/CD fine-tuning</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Performance review</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-semibold">You'll receive:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Recorded sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Custom documentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Technical recommendations</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Custom Plan */}
        <Card className="flex flex-col border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Custom</CardTitle>
            <CardDescription className="mt-2">Best for customized implementations</CardDescription>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$120</span>
              <span className="text-muted-foreground">/hour</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <Link href="/legacy/contact" className="w-full">
              <Button className="w-full bg-transparent" variant="outline">
                Contact us
              </Button>
            </Link>

            <div className="space-y-2">
              <p className="text-sm font-semibold">We typically assist with:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Debugging complex issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Third-party integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Multitenancy</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#CD7F32] mt-0.5 shrink-0" />
                  <span>Stripe customization</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-semibold">You'll receive:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Quick kickoff</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Flexible work</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Weekly updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>Pause anytime</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
