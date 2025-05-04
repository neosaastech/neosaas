import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { BrandIcon } from "@/components/brand-icon"

export function HomeHero() {
  return (
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
  )
}
