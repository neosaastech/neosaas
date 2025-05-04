import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { BrandIcon } from "@/components/brand-icon"

export function HomeCTA() {
  return (
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
  )
}
