import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Book, Layers, CreditCard, Shield, Search, Share2, Users } from 'lucide-react'

export const metadata = {
  title: "Documentation — NeoSaaS",
  description: "NeoSaaS Documentation: installation, architecture, Stripe payments, GDPR, SEO, social networks and admin management.",
  keywords: ["documentation", "docs", "guide", "tutorial", "installation", "nextjs", "stripe", "gdpr"],
}

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
            <span className="text-foreground">Neo</span>
            <span className="text-brand">SaaS</span>{" "}
            <span className="text-foreground">Documentation</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Everything you need to launch, develop and scale your SaaS
          </p>
        </div>
        <div className="hidden md:flex items-center justify-center bg-brand/10 rounded-full p-6 h-24 w-24">
          <div className="font-bold text-2xl tracking-tight">
            <span className="text-foreground">N</span>
            <span className="text-brand">S</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 border-t pt-6">

        {/* Introduction */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-3xl font-bold tracking-tight">Introduction</h2>
          <p className="text-muted-foreground">
            NeoSaaS is a full-stack, ready-to-use SaaS boilerplate. It provides all the infrastructure
            you need (auth, DB, payments, emails, admin) so you can focus
            on the business value of your product.
          </p>
          <p className="text-muted-foreground">
            Based on <strong>Next.js 15 App Router</strong>, it uses Server Actions, hybrid rendering
            (SSR/RSC) and Turbopack for fast development and optimal production performance.
          </p>
        </div>

        {/* Stack */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Tech Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Next.js 15", sub: "App Router · Server Actions · Turbopack", badge: "Framework" },
              { label: "React 19", sub: "Server & Client Components", badge: "UI" },
              { label: "PostgreSQL", sub: "Neon Serverless · Drizzle ORM", badge: "Database" },
              { label: "JWT Auth", sub: "httpOnly cookies · OAuth GitHub/Google", badge: "Security" },
              { label: "Stripe Direct", sub: "Payments · Webhooks · Product Sync", badge: "Payments" },
              { label: "Tailwind + shadcn/ui", sub: "40+ components · Dark mode · Bronze theme", badge: "Design" },
            ].map(({ label, sub, badge }) => (
              <div key={label} className="rounded-lg border bg-card p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{label}</span>
                  <Badge variant="secondary" className="text-xs">{badge}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What's included */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">What&apos;s Included</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: Shield,
                title: "Full Authentication",
                items: ["Login/Register with JWT", "OAuth GitHub & Google (via Admin UI)", "Password recovery", "Route protection (middleware)"],
              },
              {
                icon: Users,
                title: "Admin Panel",
                items: ["User & role management", "Company management", "Hierarchical API Key Manager", "Notifications & Logs"],
              },
              {
                icon: CreditCard,
                title: "Stripe Payment System",
                items: ["Direct payments", "12 webhook events", "Bidirectional product synchronization", "Test & production mode from admin"],
              },
              {
                icon: Shield,
                title: "GDPR",
                items: ["User consents", "Personal data export", "Account deletion", "Cookie banner"],
              },
              {
                icon: Search,
                title: "Basic SEO",
                items: ["Open Graph metadata", "Automatic sitemap", "robots.txt", "Canonical tags"],
              },
              {
                icon: Share2,
                title: "Social Networks",
                items: ["Configurable links from admin", "Open Graph for sharing", "Twitter Card", "Content sharing"],
              },
            ].map(({ icon: Icon, title, items }) => (
              <div key={title} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-brand" />
                  <h4 className="font-semibold text-sm">{title}</h4>
                </div>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item} className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="text-brand">·</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Project structure */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand" />
            Project Structure
          </h2>
          <p className="text-muted-foreground text-sm">
            NeoSaaS uses the Next.js 15 App Router route groups system to separate public, private, and error spaces.
          </p>
          <div className="rounded-lg border bg-card p-6">
            <pre className="text-xs overflow-x-auto text-muted-foreground">
              <code>{`app/
├── (public)/              # Public routes (landing, pricing, docs, demo)
├── (private)/             # Protected routes (dashboard, onboarding)
│   └── admin/             # Admin panel
├── (errors)/              # Error pages (404, 500, 503)
├── auth/                  # Login, Register, OAuth callback, Reset password
└── api/                   # API Routes (auth, payments, calendar, chat...)

components/
├── ui/                    # 40+ shadcn/ui components
├── layout/                # Navigation, headers, footers, sidebars
└── admin/                 # Admin-specific components

lib/
├── auth.ts                # JWT & session helpers
├── oauth/providers/       # Modular GitHub & Google OAuth
└── utils.ts               # General utilities

db/
└── schema.ts              # Drizzle ORM schema (full DB)`}</code>
            </pre>
          </div>
        </div>

        {/* When to use */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">When to use NeoSaaS?</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600 text-sm">Ideal for</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {[
                  "Launch a SaaS quickly (MVP in a few days)",
                  "Projects requiring auth + DB + payments",
                  "B2B applications with multi-user management",
                  "Agency or freelancer boilerplate",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-yellow-600 text-sm">Alternatives to consider</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {[
                  "Static sites or simple landing pages",
                  "Applications without authentication",
                  "Non-TypeScript / non-JavaScript projects",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-yellow-500">→</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center bg-brand/10 border border-brand/20 rounded-lg p-4">
        <div className="flex-1">
          <h3 className="font-semibold text-brand">Ready to get started?</h3>
          <p className="text-sm text-muted-foreground">
            Follow the installation guide to have NeoSaaS up and running in less than 10 minutes.
          </p>
        </div>
        <Link href="/docs/installation">
          <Button variant="outline" className="border-brand text-brand hover:bg-brand/10 bg-transparent">
            Installation Guide <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-brand" />
              <CardTitle>Getting Started</CardTitle>
            </div>
            <CardDescription>Installation and configuration of NeoSaaS</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs" className="text-brand hover:underline">Introduction</Link>
              </li>
              <li>
                <Link href="/docs/installation" className="text-muted-foreground hover:text-foreground">
                  Installation (full guide)
                </Link>
              </li>
              <li>
                <Link href="/docs/architecture" className="text-muted-foreground hover:text-foreground">
                  Architecture
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Articles</CardTitle>
            <CardDescription>Most viewed by developers</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center justify-between">
                <Link href="/docs/installation" className="text-sm hover:underline">
                  Install NeoSaaS
                </Link>
                <Badge variant="outline">Beginner</Badge>
              </li>
              <li className="flex items-center justify-between">
                <Link href="/docs/installation#stripe" className="text-sm hover:underline">
                  Configure Stripe
                </Link>
                <Badge variant="outline">Essential</Badge>
              </li>
              <li className="flex items-center justify-between">
                <Link href="/docs/architecture" className="text-sm hover:underline">
                  Understand the Architecture
                </Link>
                <Badge variant="outline">Advanced</Badge>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
