import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ArrowRight, Check, CheckCircle2, PartyPopper,
  Users, CreditCard, Shield, Search, Share2, Mail,
  Database, Lock, Layers, AlertTriangle, BookOpen,
} from "lucide-react"
import { BrandIcon } from "@/components/features/brand/brand-icon"

export const metadata = {
  title: "Welcome — NeoSaaS Tech",
  description: "NeoSaaS Tech — Ready-to-use SaaS boilerplate. Next.js 15, Stripe, JWT Auth, PostgreSQL, GDPR, SEO.",
  keywords: ["SaaS", "boilerplate", "nextjs", "stripe", "postgresql", "starter"],
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* ── HERO ── */}
      <section className="w-full py-16 md:py-28 bg-background border-b">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <BrandIcon className="bg-brand/10" />
            <PartyPopper className="h-8 w-8 text-brand" />
          </div>
          <Badge className="bg-brand text-white mb-4">SaaS Boilerplate · Ready to use</Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl mb-4">
            Congratulations — <br className="hidden md:block" />
            <span className="text-brand">your SaaS boilerplate is ready.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            NeoSaaS Tech provides all the infrastructure you need to launch your SaaS:
            authentication, payments, emails, admin, GDPR and SEO — already in place.
            Now build what makes your product unique.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/docs/installation">
              <Button size="lg" className="bg-brand hover:bg-brand/90 text-white gap-2">
                <BookOpen className="h-5 w-5" />
                Start Installation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="bg-transparent gap-2">
                Read the Documentation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section className="w-full py-14 md:py-20 bg-muted/30">
        <div className="container px-4 md:px-6 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3">Tech Stack</Badge>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Built on Modern Technologies</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Every component was chosen for its robustness, maintainability and production performance.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: Layers,
                title: "Next.js 15 · App Router",
                desc: "Server Components, Server Actions, Turbopack. Grouped routes (public/private/error). Optimal SSR/RSC hybrid rendering.",
                badge: "Framework",
              },
              {
                icon: Database,
                title: "PostgreSQL · Drizzle ORM",
                desc: "Type-safe schema, versioned migrations, Drizzle Studio to visualize the DB. Compatible with Neon, Supabase, Railway.",
                badge: "Database",
              },
              {
                icon: Lock,
                title: "JWT Auth · OAuth GitHub/Google",
                desc: "Secure httpOnly cookies. GitHub and Google OAuth configured from admin — no environment variables required.",
                badge: "Authentication",
              },
              {
                icon: CreditCard,
                title: "Stripe Direct v20",
                desc: "Direct payments, 12 webhooks, bidirectional product synchronization. Test/production mode managed from /admin.",
                badge: "Payments",
              },
              {
                icon: Mail,
                title: "Multi-provider Emails",
                desc: "Resend (recommended), Scaleway TEM, AWS SES. Customizable templates from the admin interface.",
                badge: "Emails",
              },
              {
                icon: Shield,
                title: "Tailwind CSS · shadcn/ui",
                desc: "40+ Radix UI components. Bronze theme system, dark mode, typography and semantic colors via CSS variables.",
                badge: "UI",
              },
            ].map(({ icon: Icon, title, desc, badge }) => (
              <div key={title} className="flex gap-4 p-5 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand shrink-0 mt-0.5">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{title}</h3>
                    <Badge variant="secondary" className="text-xs">{badge}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INCLUDED MODULES ── */}
      <section className="w-full py-14 md:py-20 bg-background">
        <div className="container px-4 md:px-6 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3">Included Modules</Badge>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Everything your SaaS needs</h2>
            <p className="text-muted-foreground mt-2">
              These features are operational right after installation. No complex configuration.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Users, label: "Admin Management", sub: "Users, roles, companies, API Keys" },
              { icon: CreditCard, label: "Stripe Payments", sub: "Payments, webhooks, product sync" },
              { icon: Shield, label: "GDPR", sub: "Consents, export, deletion" },
              { icon: Search, label: "Basic SEO", sub: "Open Graph, sitemap, robots.txt" },
              { icon: Share2, label: "Social Networks", sub: "Configurable links from admin" },
              { icon: Mail, label: "Emails", sub: "Admin templates, multi-provider" },
              { icon: Lock, label: "OAuth", sub: "GitHub & Google via admin UI" },
              { icon: Users, label: "Bookings", sub: "Calendar, integrated appointments" },
              { icon: Database, label: "Products & Store", sub: "Digital products, checkout" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Check className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROJECT STRUCTURE ── */}
      <section className="w-full py-14 md:py-20 bg-muted/30">
        <div className="container px-4 md:px-6 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <Badge variant="outline" className="mb-3">Architecture</Badge>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl mb-3">
                Next.js 15 App Router Structure
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Routes grouped by context: public, private and errors. Each folder in{" "}
                <code className="bg-muted px-1 rounded">app/</code> is a route — add your pages wherever needed.
              </p>
              <div className="space-y-3">
                {[
                  { path: "app/(public)/", desc: "Routes accessible without login (landing, pricing, docs)" },
                  { path: "app/(private)/", desc: "JWT-protected routes (dashboard, onboarding)" },
                  { path: "app/(private)/admin/", desc: "Admin panel — admin role required" },
                  { path: "app/api/", desc: "Next.js API Routes (auth, payments, webhooks...)" },
                  { path: "db/schema.ts", desc: "Drizzle ORM schema — add your tables here" },
                  { path: "middleware.ts", desc: "ACL — defines which routes are protected" },
                ].map(({ path, desc }) => (
                  <div key={path} className="flex gap-3 text-sm">
                    <code className="text-brand font-mono text-xs bg-brand/5 px-2 py-1 rounded shrink-0 self-start">{path}</code>
                    <span className="text-muted-foreground text-xs mt-1">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <pre className="text-xs text-muted-foreground overflow-x-auto leading-relaxed">
                <code>{`app/
├── (public)/
│   ├── page.tsx          ← you are here
│   ├── pricing/          ← dynamic (DB)
│   ├── legal/            ← GDPR (DB)
│   │   ├── privacy/
│   │   └── terms/
│   ├── docs/             ← documentation
│   └── store/
├── (private)/
│   ├── dashboard/        ← user space
│   └── admin/            ← admin panel
├── (errors)/             ← 404, 500, 503
├── auth/                 ← login, register, oauth
└── api/                  ← backend routes

db/schema.ts              ← your DB schema
middleware.ts             ← ACL & route protection`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── DYNAMIC PAGES ── */}
      <section className="w-full py-10 bg-background">
        <div className="container px-4 md:px-6 max-w-5xl mx-auto">
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">Dynamic pages to preserve</AlertTitle>
            <AlertDescription className="mt-3 space-y-3">
              <p className="text-sm">
                These pages are dynamically generated from the database. Do not delete them — customize their content from the admin panel.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <div className="rounded-md border border-amber-500/30 bg-background p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-500" />
                    <code className="text-xs font-mono font-semibold">/legal/privacy</code>
                    <span className="text-xs text-muted-foreground">and</span>
                    <code className="text-xs font-mono font-semibold">/legal/terms</code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    GDPR pages (Privacy Policy & Terms of Service). Content managed from{" "}
                    <code className="bg-muted px-1 rounded">/admin/settings</code>.
                    Links required in the footer for legal compliance.
                  </p>
                </div>
                <div className="rounded-md border border-amber-500/30 bg-background p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-500" />
                    <code className="text-xs font-mono font-semibold">/pricing</code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pricing page generated from products published in Stripe.
                    Manage your offers from{" "}
                    <code className="bg-muted px-1 rounded">/admin/products</code>.
                    Automatically displayed once a product is published.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* ── CTA INSTALLATION ── */}
      <section className="w-full py-14 md:py-24 bg-[#1A1A1A] text-white">
        <div className="container px-4 md:px-6 max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BrandIcon className="bg-white/10" />
            <CheckCircle2 className="h-7 w-7 text-brand" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-3">
            Your boilerplate is waiting.
          </h2>
          <p className="text-white/70 md:text-lg mb-8 max-w-xl mx-auto">
            Configure your environment variables, initialize the database, and get started.
            The infrastructure is ready — launch your product.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-8 text-left">
            {[
              { step: "1", label: "Configure .env", detail: "DATABASE_URL · NEXTAUTH_SECRET · Email" },
              { step: "2", label: "Initialize the DB", detail: "pnpm db:push && pnpm db:seed" },
              { step: "3", label: "Launch", detail: "pnpm dev → localhost:3000" },
            ].map(({ step, label, detail }) => (
              <div key={step} className="flex gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-xs font-bold shrink-0">{step}</span>
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-white/50 font-mono mt-0.5">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/docs/installation">
              <Button size="lg" className="bg-brand hover:bg-brand/90 text-white gap-2">
                <BookOpen className="h-5 w-5" />
                Full Installation Guide
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10 bg-transparent">
                View Pricing Page
              </Button>
            </Link>
          </div>

          <p className="text-xs text-white/40 mt-6">
            First admin access: <code className="text-white/60">admin@exemple.com</code> /{" "}
            <code className="text-white/60">admin</code> — change immediately
          </p>
        </div>
      </section>

    </div>
  )
}
