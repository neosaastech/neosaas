import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowLeft } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="container py-12 md:py-16">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">About Us</h1>
        <p className="mt-2 text-muted-foreground">Learn about our journey, mission, and the team behind NeoSaaS.</p>
      </div>

      <div className="grid gap-12">
        {/* Our Story */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Our Story</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-4">
                NeoSaaS started in 2018 with a simple mission: to make powerful SaaS tools accessible to businesses of
                all sizes. What began as a small project between three developers has grown into a comprehensive
                platform serving thousands of companies worldwide.
              </p>
              <p className="text-muted-foreground">
                We recognized that many businesses were struggling with complex, expensive software solutions that
                required extensive technical knowledge. Our team set out to create an intuitive, all-in-one platform
                that would empower businesses to focus on growth rather than managing their tools.
              </p>
            </div>
            <div className="rounded-lg bg-muted h-64 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold">2018</p>
                <p className="text-muted-foreground">Year Founded</p>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Our Journey</h2>
          <div className="space-y-8">
            <div className="relative pl-8 pb-4 border-l">
              <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full -translate-x-1/2 bg-primary text-primary-foreground font-bold text-sm">
                1
              </div>
              <div className="space-y-2">
                <Badge>2018</Badge>
                <h3 className="text-xl font-semibold">The Beginning</h3>
                <p className="text-muted-foreground">
                  NeoSaaS was founded by three developers with a vision to simplify SaaS solutions for businesses.
                </p>
              </div>
            </div>

            <div className="relative pl-8 pb-4 border-l">
              <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full -translate-x-1/2 bg-primary text-primary-foreground font-bold text-sm">
                2
              </div>
              <div className="space-y-2">
                <Badge>2019</Badge>
                <h3 className="text-xl font-semibold">First Major Release</h3>
                <p className="text-muted-foreground">
                  Launched our first comprehensive platform with user management, billing, and analytics features.
                </p>
              </div>
            </div>

            <div className="relative pl-8 pb-4 border-l">
              <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full -translate-x-1/2 bg-primary text-primary-foreground font-bold text-sm">
                3
              </div>
              <div className="space-y-2">
                <Badge>2020</Badge>
                <h3 className="text-xl font-semibold">Scaling Up</h3>
                <p className="text-muted-foreground">
                  Secured Series A funding and expanded our team to 25 members across engineering, design, and customer
                  support.
                </p>
              </div>
            </div>

            <div className="relative pl-8 pb-4 border-l">
              <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full -translate-x-1/2 bg-primary text-primary-foreground font-bold text-sm">
                4
              </div>
              <div className="space-y-2">
                <Badge>2022</Badge>
                <h3 className="text-xl font-semibold">Global Expansion</h3>
                <p className="text-muted-foreground">
                  Opened offices in Europe and Asia, bringing our solutions to businesses worldwide.
                </p>
              </div>
            </div>

            <div className="relative pl-8">
              <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full -translate-x-1/2 bg-primary text-primary-foreground font-bold text-sm">
                5
              </div>
              <div className="space-y-2">
                <Badge>2023</Badge>
                <h3 className="text-xl font-semibold">Today</h3>
                <p className="text-muted-foreground">
                  Serving over 10,000 businesses globally, with a comprehensive platform that continues to evolve.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Our Core Values</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-6">
              <CheckCircle className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold">Simplicity</h3>
              <p className="text-muted-foreground mt-2">
                We believe powerful tools should be simple to use. We strip away complexity without sacrificing
                functionality.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <CheckCircle className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold">Innovation</h3>
              <p className="text-muted-foreground mt-2">
                We're constantly pushing boundaries to bring the latest technologies and methodologies to our platform.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <CheckCircle className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold">Reliability</h3>
              <p className="text-muted-foreground mt-2">
                Businesses depend on our platform. We prioritize stability, security, and performance above all else.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <CheckCircle className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold">Customer Focus</h3>
              <p className="text-muted-foreground mt-2">
                Our customers drive every decision we make. We listen, learn, and adapt to their needs.
              </p>
            </div>
          </div>
        </section>

        {/* Team */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Our Leadership Team</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-6">
              <div className="h-40 bg-muted rounded-lg mb-4"></div>
              <h3 className="text-xl font-semibold">Sarah Johnson</h3>
              <p className="text-primary">Co-Founder & CEO</p>
              <p className="text-muted-foreground mt-2">
                Sarah brings 15 years of tech leadership experience and a passion for building accessible software.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <div className="h-40 bg-muted rounded-lg mb-4"></div>
              <h3 className="text-xl font-semibold">Michael Chen</h3>
              <p className="text-primary">Co-Founder & CTO</p>
              <p className="text-muted-foreground mt-2">
                Michael is an experienced engineer with expertise in scalable architecture and cloud solutions.
              </p>
            </div>

            <div className="rounded-lg border p-6">
              <div className="h-40 bg-muted rounded-lg mb-4"></div>
              <h3 className="text-xl font-semibold">David Rodriguez</h3>
              <p className="text-primary">Co-Founder & COO</p>
              <p className="text-muted-foreground mt-2">
                David oversees operations with a focus on building scalable processes and customer satisfaction.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
