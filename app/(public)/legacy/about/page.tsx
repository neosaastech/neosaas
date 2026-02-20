import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowLeft, Shield, Zap, Globe, Server } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="container py-12 md:py-16">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">About NeoSaaS</h1>
        <p className="mt-2 text-muted-foreground">The Ultimate SaaS Starter Kit for the European Market.</p>
      </div>

      <div className="grid gap-12">
        {/* Mission */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                NeoSaaS is a project by <a href="https://www.neomnia.net" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Neomnia</a>, 
                an AI Product Manager studio specializing in development, tech projects, and innovation.
              </p>
              <p className="text-muted-foreground">
                Our goal is to provide a <strong>ready-to-use template</strong> to rapidly develop your SaaS and avoid the massive time loss associated with deploying base resources 
                (Login, Admin, User Management, Payments). We empower developers and entrepreneurs to focus on their core value proposition.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-6 flex flex-col justify-center border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Accelerate Your Launch
              </h3>
              <p className="text-sm text-muted-foreground">
                Stop rebuilding the wheel. NeoSaaS gives you a production-ready foundation so you can launch in days, not months.
              </p>
            </div>
          </div>
        </section>

        {/* EU Compliance */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Built for Europe (DMA & DSA)</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="order-2 md:order-1 rounded-lg bg-blue-50 dark:bg-blue-950/20 p-6 flex flex-col justify-center border border-blue-100 dark:border-blue-900">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Shield className="h-5 w-5" />
                Compliance First
              </h3>
              <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                Native support for GDPR, cookie consent, and data sovereignty requirements.
              </p>
            </div>
            <div className="order-1 md:order-2 space-y-4">
              <p className="text-muted-foreground">
                We offer a specific SaaS framework designed for the <strong>European Digital Markets Act (DMA)</strong> and <strong>Digital Services Act (DSA)</strong>. 
                Compliance is not an afterthought; it's baked into the core of NeoSaaS.
              </p>
              <p className="text-muted-foreground">
                This is why our infrastructure relies on <strong>Scaleway</strong> (a European cloud provider) for transactional emails and hosting, ensuring data sovereignty. 
                Furthermore, a complete <strong>GDPR management system</strong> is included out of the box to handle user consent and data rights.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Why Choose NeoSaaS?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 border rounded-lg bg-card">
              <Globe className="h-8 w-8 mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Neomnia Ecosystem</h3>
              <p className="text-sm text-muted-foreground">Backed by the expertise of Neomnia, a leading AI Product Management studio.</p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <Server className="h-8 w-8 mb-4 text-primary" />
              <h3 className="font-semibold mb-2">European Sovereignty</h3>
              <p className="text-sm text-muted-foreground">Optimized for Scaleway and European infrastructure providers.</p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <Shield className="h-8 w-8 mb-4 text-primary" />
              <h3 className="font-semibold mb-2">GDPR & DSA Ready</h3>
              <p className="text-sm text-muted-foreground">Built-in compliance tools, consent management, and legal pages.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
