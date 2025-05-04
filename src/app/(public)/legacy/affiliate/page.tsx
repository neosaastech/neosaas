import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, DollarSign, Users, Gift } from "lucide-react"

export default function AffiliatePage() {
  return (
    <div className="container py-12 md:py-24">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Home
        </Link>
        <div className="mt-4 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Earn Rewards with our Affiliate Program
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Join our affiliate program and earn generous commissions for referring customers to NeoSaaS. It's simple to
            start and rewarding to grow.
          </p>
          <div className="mt-6">
            <Button size="lg" className="gap-2">
              Join Our Affiliate Program <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-12">
        <div>
          <h2 className="text-3xl font-bold mb-6">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>1. Sign Up</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Register for our affiliate program. We'll review your application and provide you with your unique
                  referral link.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>2. Share & Refer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Share your unique affiliate link with your audience through your website, social media, email, or
                  other channels.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>3. Earn Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Earn commissions for every new customer who signs up using your referral link. Payouts are processed
                  monthly.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold mb-6">Why Become an Affiliate?</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>30%</CardTitle>
                <CardDescription>Commission Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Earn generous commissions on all plans for the first year of a customer's subscription.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>90 Days</CardTitle>
                <CardDescription>Cookie Duration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our cookies last for 90 days, giving you more time to convert your traffic.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>$50</CardTitle>
                <CardDescription>Minimum Payout</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Low minimum payout threshold so you can get your earnings faster.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly</CardTitle>
                <CardDescription>Payment Schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Receive your commissions reliably every month via PayPal, Stripe, or bank transfer.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Join hundreds of successful affiliates who are already earning substantial commissions by promoting NeoSaaS.
          </p>
          <Button size="lg">Apply to Become an Affiliate</Button>
        </div>
      </div>
    </div>
  )
}
