import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Info, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Terminal, Database, Key, Mail, CreditCard, Shield, Code2, Lock, Zap } from "lucide-react"

export const metadata = {
  title: "Installation — NeoSaaS Tech",
  description: "Complete NeoSaaS Tech installation guide: prerequisites, environment variables, database, first admin, and module configuration.",
  keywords: ["installation", "setup", "configure", "deploy", "getting started", "nextjs", "pnpm", "neon", "stripe"],
}

export default function InstallationPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="scroll-m-20 text-3xl font-bold tracking-tight">Installation</h1>
          <Badge variant="secondary">Next.js 15 · App Router</Badge>
        </div>
        <p className="text-lg text-muted-foreground">
          Complete guide to install and configure NeoSaaS locally or in production
        </p>
      </div>

      <div className="flex items-center space-x-2 text-sm">
        <Link href="/docs" className="text-muted-foreground hover:text-foreground">Documentation</Link>
        <span className="text-muted-foreground">/</span>
        <span>Installation</span>
      </div>

      {/* Quick overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Terminal, label: "Node.js 18+" },
          { icon: Database, label: "PostgreSQL (Neon)" },
          { icon: Key, label: "JWT Auth" },
          { icon: CreditCard, label: "Stripe Direct" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 p-3 rounded-lg border bg-card text-sm">
            <Icon className="h-4 w-4 text-brand shrink-0" />
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-10">

        {/* ── STEP 0 : Prerequisites ── */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">0</span>
            Prerequisites
          </h2>
          <ul className="list-none space-y-2 pl-2">
            {[
              "Node.js 18.0 or higher",
              "pnpm (recommended package manager)",
              "Git",
              "A Neon account (free serverless PostgreSQL) — or any compatible PostgreSQL",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <p className="text-sm font-medium">Install pnpm (if not installed):</p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>npm install -g pnpm</code>
            </pre>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Why pnpm?</AlertTitle>
            <AlertDescription>
              NeoSaaS uses <strong>pnpm</strong> as its package manager. It is faster and more efficient than npm or yarn.
              The <code className="bg-muted px-1 rounded">pnpm db:*</code> scripts are essential for database management.
            </AlertDescription>
          </Alert>
        </div>

        {/* ── STEP 1 : Clone ── */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">1</span>
            Clone the Repository
          </h2>

          <Tabs defaultValue="clone" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="clone">Git Clone</TabsTrigger>
              <TabsTrigger value="download">ZIP Download</TabsTrigger>
            </TabsList>
            <TabsContent value="clone" className="space-y-3">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>{`git clone https://github.com/neosaastech/neosaas.git
cd neosaas`}</code>
              </pre>
            </TabsContent>
            <TabsContent value="download" className="space-y-3">
              <p className="text-sm text-muted-foreground">Download the ZIP archive from GitHub and extract it.</p>
              <Link href="https://github.com/neosaastech/neosaas/archive/refs/heads/main.zip" target="_blank" rel="noopener noreferrer">
                <Button className="bg-brand hover:bg-brand/90">Download ZIP</Button>
              </Link>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── STEP 2 : Install ── */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">2</span>
            Install Dependencies
          </h2>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
            <code>pnpm install</code>
          </pre>
          <p className="text-sm text-muted-foreground">
            Installs Next.js 15, Drizzle ORM, Tailwind CSS, shadcn/ui, Stripe and all other dependencies.
          </p>
        </div>

        {/* ── STEP 3 : ENV ── */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">3</span>
            Configure Environment Variables
          </h2>

          <p>Copy the example file and fill in your values:</p>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
            <code>cp .env.example .env</code>
          </pre>

          <div className="space-y-6">

            {/* DATABASE */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-brand" />
                <h3 className="font-semibold">Database (required)</h3>
                <Badge variant="outline" className="text-xs">Neon · PostgreSQL</Badge>
              </div>
              <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                <code>{`# Pooled URL (pgBouncer) — for application queries
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-XXXX-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Direct URL — for Drizzle migrations (replace "-pooler" with the direct endpoint)
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:PASSWORD@ep-XXXX.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`}</code>
              </pre>
              <p className="text-xs text-muted-foreground">
                Create a free project on{" "}
                <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">neon.tech</a>
                {" "}— both URLs can be found in the <em>Connection Details</em> tab of your Neon project.
              </p>
            </div>

            {/* AUTH */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-brand" />
                <h3 className="font-semibold">Authentication (required)</h3>
                <Badge variant="outline" className="text-xs">JWT · httpOnly cookies</Badge>
              </div>
              <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                <code>{`# JWT Secret — minimum 32 characters
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters-long

# Public URL of the application
NEXT_PUBLIC_APP_URL=http://localhost:3000`}</code>
              </pre>
              <p className="text-xs text-muted-foreground">
                Generate a secure secret with:{" "}
                <code className="bg-muted px-1 rounded">openssl rand -base64 32</code>
              </p>
            </div>

            {/* EMAIL */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand" />
                <h3 className="font-semibold">Email (choose 1 provider)</h3>
              </div>
              <Tabs defaultValue="resend">
                <TabsList>
                  <TabsTrigger value="resend">Resend (recommended)</TabsTrigger>
                  <TabsTrigger value="scaleway">Scaleway TEM</TabsTrigger>
                  <TabsTrigger value="ses">AWS SES</TabsTrigger>
                </TabsList>
                <TabsContent value="resend">
                  <pre className="bg-muted p-3 rounded text-xs font-mono mt-2">
                    <code>RESEND_API_KEY=re_xxxxxxxxxxxx</code>
                  </pre>
                  <p className="text-xs text-muted-foreground mt-2">
                    Create a free account on{" "}
                    <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">resend.com</a>
                    {" "}(100 free emails/day).
                  </p>
                </TabsContent>
                <TabsContent value="scaleway">
                  <pre className="bg-muted p-3 rounded text-xs font-mono mt-2">
                    <code>{`SCALEWAY_TEM_PROJECT_ID=your-project-id
SCALEWAY_TEM_SECRET_KEY=your-secret-key
SCALEWAY_TEM_API_URL=https://api.tem.scaleway.com`}</code>
                  </pre>
                </TabsContent>
                <TabsContent value="ses">
                  <pre className="bg-muted p-3 rounded text-xs font-mono mt-2">
                    <code>{`AWS_REGION=eu-west-1
AWS_SES_ACCESS_KEY_ID=your-access-key
AWS_SES_SECRET_ACCESS_KEY=your-secret-key`}</code>
                  </pre>
                </TabsContent>
              </Tabs>
            </div>

            {/* STRIPE */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand" />
                <h3 className="font-semibold">Stripe (optional locally)</h3>
                <Badge variant="outline" className="text-xs">Configurable via Admin UI</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Stripe keys are stored encrypted in the database and configurable from{" "}
                <code className="bg-muted px-1 rounded">/admin/api</code>.
                The environment variables below are optional (fallback):
              </p>
              <pre className="bg-muted p-3 rounded text-xs font-mono">
                <code>{`# Optional — managed via /admin/api
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...`}</code>
              </pre>
            </div>

            {/* OPTIONAL */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand" />
                <h3 className="font-semibold">Optional Variables</h3>
              </div>
              <pre className="bg-muted p-3 rounded text-xs font-mono">
                <code>{`# Contact email (support form)
CONTACT_EMAIL=support@yourdomain.com

# Admin email (notifications)
ADMIN_EMAIL=admin@yourdomain.com`}</code>
              </pre>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>OAuth GitHub &amp; Google</AlertTitle>
            <AlertDescription>
              OAuth credentials (GitHub, Google) are configured from the admin interface{" "}
              <code className="bg-muted px-1 rounded">/admin/api</code> — no environment variables required.
            </AlertDescription>
          </Alert>
        </div>

        {/* ── STEP 4 : Database ── */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">4</span>
            Initialize the Database
          </h2>

          <p className="text-sm">Apply the schema and inject the initial data:</p>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
            <code>{`# Apply the Drizzle schema to the database
pnpm db:push

# Inject initial data (admin, plans, config...)
pnpm db:seed`}</code>
          </pre>

          <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
            <p className="text-sm font-medium">Available database commands:</p>
            <ul className="space-y-1 text-xs font-mono text-muted-foreground">
              <li><code className="text-foreground">pnpm db:push</code> — Applies the schema without migration</li>
              <li><code className="text-foreground">pnpm db:migrate</code> — Runs SQL migrations</li>
              <li><code className="text-foreground">pnpm db:seed</code> — Populates the DB with default data</li>
              <li><code className="text-foreground">pnpm db:studio</code> — Opens Drizzle Studio (visual UI)</li>
              <li><code className="text-foreground">pnpm db:hard-reset</code> — Fully resets + migrate + seed</li>
            </ul>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Automatic reset on deployment</AlertTitle>
            <AlertDescription>
              By default, the database is reset on every Vercel deployment (schema recreated + seed re-applied).
              To disable this behavior in production, refer to the deployment documentation.
            </AlertDescription>
          </Alert>
        </div>

        {/* ── STEP 5 : Dev server ── */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">5</span>
            Start the Development Server
          </h2>

          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
            <code>pnpm dev</code>
          </pre>

          <p className="text-sm">
            The application is available at{" "}
            <code className="bg-muted px-2 py-1 rounded">http://localhost:3000</code>
          </p>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Turbopack enabled</AlertTitle>
            <AlertDescription>
              Development mode uses <strong>Turbopack</strong> (next-generation Next.js bundler) for ultra-fast hot reloads.
            </AlertDescription>
          </Alert>
        </div>

        {/* ── STEP 6 : First admin ── */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">6</span>
            First Access — Administrator Account
          </h2>

          <p>Go to <code className="bg-muted px-2 py-1 rounded">http://localhost:3000/auth/login</code> and sign in with the default credentials:</p>

          <div className="bg-muted p-5 rounded-lg space-y-3 font-mono text-sm">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-muted-foreground w-24">Email:</span>
              <code className="bg-background px-3 py-1 rounded border">admin@exemple.com</code>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-muted-foreground w-24">Password:</span>
              <code className="bg-background px-3 py-1 rounded border">admin</code>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Security — Change these credentials immediately</AlertTitle>
            <AlertDescription>
              These default credentials are public. Change them immediately after first login from{" "}
              <code className="bg-background/50 px-1 rounded">/admin/settings</code> or <code className="bg-background/50 px-1 rounded">/dashboard/profile</code>.
            </AlertDescription>
          </Alert>
        </div>

        {/* ── STEP 7 : Modules overview ── */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">7</span>
            Modules Available After Installation
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                title: "Admin Panel",
                path: "/admin",
                description: "User, role, company, API key management, and global settings.",
              },
              {
                title: "Stripe Payments",
                path: "/admin/api → Stripe",
                description: "Configure your Stripe keys from admin. Direct payments, webhooks, product synchronization.",
              },
              {
                title: "GDPR Management",
                path: "/dashboard/privacy",
                description: "User consents, data export, account deletion, GDPR compliance.",
              },
              {
                title: "Basic SEO",
                path: "Automatic",
                description: "Open Graph metadata, sitemap, robots.txt, canonical tags generated automatically.",
              },
              {
                title: "Social Networks",
                path: "/admin/settings",
                description: "Social network links configurable from admin (Twitter/X, LinkedIn, GitHub, etc.).",
              },
              {
                title: "OAuth Authentication",
                path: "/admin/api → OAuth",
                description: "GitHub and Google OAuth configured from admin, without environment variables.",
              },
              {
                title: "Transactional Emails",
                path: "/admin/emails",
                description: "Customizable email templates from the admin interface. Multi-provider (Resend, Scaleway, SES).",
              },
            ].map(({ title, path, description }) => (
              <div key={title} className="rounded-lg border p-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm">{title}</h4>
                  <Badge variant="secondary" className="text-xs font-mono shrink-0">{path}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP 8 : Production deploy ── */}
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">8</span>
            Production Deployment (Vercel)
          </h2>

          <ol className="space-y-2 text-sm list-decimal pl-5">
            <li>Import the repository on <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">vercel.com</a></li>
            <li>Add the environment variables (DATABASE_URL, NEXTAUTH_SECRET, NEXT_PUBLIC_APP_URL, email provider)</li>
            <li>Set <code className="bg-muted px-1 rounded">NEXT_PUBLIC_APP_URL</code> to the production URL (e.g.: <code className="bg-muted px-1 rounded">https://www.mysite.com</code>)</li>
            <li>Deploy — the database initializes automatically on first deployment</li>
          </ol>

          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
            <code>{`# Production build (includes DB configuration)
pnpm build

# Or Next.js build only
pnpm build:local`}</code>
          </pre>
        </div>

        {/* ── STEP 9 : Next steps for developer ── */}
        <div className="space-y-6 border-t pt-6">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-sm font-bold shrink-0">9</span>
            Next Steps — Develop Your Project
          </h2>
          <p className="text-sm text-muted-foreground">
            NeoSaaS gives you the foundations. Now it&apos;s your turn to build your product on it.
            Here are the three priority development areas.
          </p>

          {/* 9A — Create pages & services */}
          <div className="rounded-lg border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-brand" />
              <h3 className="font-semibold">A — Create your pages and backend services</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              The project follows the <strong>Next.js 15 App Router</strong> convention. Each folder in{" "}
              <code className="bg-muted px-1 rounded">app/</code> becomes a route.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Public pages</p>
                <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                  <code>{`# Add a public page
app/(public)/my-page/page.tsx`}</code>
                </pre>
              </div>
              <div>
                <p className="font-medium mb-1">Private pages (logged-in users)</p>
                <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                  <code>{`# Add a dashboard page
app/(private)/dashboard/my-service/page.tsx`}</code>
                </pre>
              </div>
              <div>
                <p className="font-medium mb-1">API Routes (backend)</p>
                <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                  <code>{`# Add an API route
app/api/my-service/route.ts

# Typical API route structure
export async function GET(request: Request) { ... }
export async function POST(request: Request) { ... }`}</code>
                </pre>
              </div>
              <div>
                <p className="font-medium mb-1">Server Actions (forms, mutations)</p>
                <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                  <code>{`// lib/actions/my-service.ts
"use server"

export async function createItem(data: FormData) {
  // Executed server-side, accessible from client components
}`}</code>
                </pre>
              </div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Database Schema</AlertTitle>
              <AlertDescription>
                To add tables, edit <code className="bg-muted px-1 rounded">db/schema.ts</code> with Drizzle ORM,
                then run <code className="bg-muted px-1 rounded">pnpm db:push</code> to apply the changes.
              </AlertDescription>
            </Alert>
          </div>

          {/* 9B — Connect Stripe */}
          <div className="rounded-lg border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-brand" />
              <h3 className="font-semibold">B — Connect your project to the payment system</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              NeoSaaS uses <strong>Stripe Direct</strong>. Configuration is done entirely from the admin interface, without touching the code.
            </p>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-brand text-xs font-bold shrink-0">1</span>
                <div>
                  <p className="font-medium">Create a Stripe account</p>
                  <p className="text-muted-foreground text-xs">
                    Go to{" "}
                    <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">stripe.com</a>
                    {" "}— get your API keys (test mode then production).
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-brand text-xs font-bold shrink-0">2</span>
                <div>
                  <p className="font-medium">Configure in admin</p>
                  <p className="text-muted-foreground text-xs">
                    Go to <code className="bg-muted px-1 rounded">/admin/api</code> → &apos;Stripe&apos; Service → fill in{" "}
                    <code className="bg-muted px-1 rounded">Secret Key</code>,{" "}
                    <code className="bg-muted px-1 rounded">Publishable Key</code> and{" "}
                    <code className="bg-muted px-1 rounded">Webhook Secret</code>.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-brand text-xs font-bold shrink-0">3</span>
                <div>
                  <p className="font-medium">Configure the Stripe webhook</p>
                  <p className="text-muted-foreground text-xs">
                    In the Stripe dashboard, create a webhook pointing to{" "}
                    <code className="bg-muted px-1 rounded">https://your-domain.com/api/webhooks/stripe</code>.
                    NeoSaaS handles 12 Stripe events automatically.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-brand text-xs font-bold shrink-0">4</span>
                <div>
                  <p className="font-medium">Synchronize products</p>
                  <p className="text-muted-foreground text-xs">
                    In <code className="bg-muted px-1 rounded">/admin/products</code>, create your products/plans.
                    Stripe synchronization is bidirectional and automatic.
                  </p>
                </div>
              </li>
            </ol>
            <div className="bg-muted/50 rounded p-3 text-xs text-muted-foreground">
              <strong>Local testing:</strong> Use{" "}
              <code className="bg-muted px-1 rounded">stripe listen --forward-to localhost:3000/api/webhooks/stripe</code>
              {" "}to test webhooks locally with the Stripe CLI.
            </div>
          </div>

          {/* 9C — ACL */}
          <div className="rounded-lg border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-brand" />
              <h3 className="font-semibold">C — Update ACLs for your project</h3>
              <Badge variant="destructive" className="text-xs">Important</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ACLs (Access Control Lists) define which routes are accessible based on the user&apos;s role.
              <strong> You must adapt them to your project&apos;s structure.</strong>
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Route protection middleware</p>
                <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                  <code>{`// middleware.ts (project root)
// Defines protected routes and redirects
export const config = {
  matcher: [
    "/dashboard/:path*",   // Protected — logged-in users
    "/admin/:path*",       // Protected — admin role only
    "/onboarding/:path*",  // Protected — new users
  ],
}`}</code>
                </pre>
              </div>
              <div>
                <p className="font-medium mb-1">Available roles</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { role: "admin", desc: "Full access to /admin and /dashboard" },
                    { role: "user", desc: "Access to /dashboard only" },
                    { role: "company_admin", desc: "Manage company users" },
                    { role: "viewer", desc: "Read only" },
                  ].map(({ role, desc }) => (
                    <div key={role} className="rounded border p-2 space-y-1">
                      <code className="text-xs text-brand">{role}</code>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium mb-1">Role verification in a page or API</p>
                <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                  <code>{`// In a Server Component or API Route
import { getSession } from "@/lib/auth"

const session = await getSession()
if (!session || session.role !== "admin") {
  // Redirect or return 403
}

// Protect an API Route
if (session.role !== "admin") {
  return Response.json({ error: "Forbidden" }, { status: 403 })
}`}</code>
                </pre>
              </div>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>To do before going to production</AlertTitle>
                <AlertDescription>
                  Audit the <code className="bg-background/50 px-1 rounded">middleware.ts</code> file and all your API Routes to
                  verify that role checks match your business logic.
                  Never leave an admin route accessible to non-admin users.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Quick summary */}
          <div className="rounded-lg bg-brand/5 border border-brand/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand" />
              <h3 className="font-semibold">Summary — Startup Checklist</h3>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                { done: true, text: "Clone the repo and install dependencies (pnpm install)" },
                { done: true, text: "Configure .env (DATABASE_URL, NEXTAUTH_SECRET, email provider)" },
                { done: true, text: "Initialize the DB (pnpm db:push && pnpm db:seed)" },
                { done: true, text: "Start the server (pnpm dev) and sign in as admin" },
                { done: false, text: "Change the default admin credentials" },
                { done: false, text: "Configure Stripe from /admin/api" },
                { done: false, text: "Configure your email provider from /admin/api" },
                { done: false, text: "Create your pages in app/(public)/ and app/(private)/" },
                { done: false, text: "Add your tables in db/schema.ts and pnpm db:push" },
                { done: false, text: "Adapt the ACLs (middleware.ts) to your business logic" },
                { done: false, text: "Configure OAuth (GitHub/Google) from /admin/api if needed" },
                { done: false, text: "Deploy to Vercel with production environment variables" },
              ].map(({ done, text }) => (
                <li key={text} className="flex items-start gap-2">
                  <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${done ? "text-green-500" : "text-muted-foreground/40"}`} />
                  <span className={done ? "text-muted-foreground line-through" : ""}>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Final alert */}
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>You&apos;re ready!</AlertTitle>
          <AlertDescription>
            NeoSaaS is your foundation — auth, DB, payments, emails, admin are ready.
            Focus on the value of your product: create your pages, your backend services,
            and adapt the ACLs to your business logic.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between pt-4 border-t">
          <Link href="/docs">
            <Button variant="outline" className="gap-1 bg-transparent">
              <ArrowLeft className="h-4 w-4" /> Introduction
            </Button>
          </Link>
          <Link href="/docs/architecture">
            <Button variant="outline" className="gap-1 bg-transparent">
              Architecture <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
