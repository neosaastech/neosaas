import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Info, Database, Code, Server, Layers } from "lucide-react"

export const metadata = {
  title: "Architecture",
  description: "Understand the NeoSaaS architecture and how components work together. Learn about client layer, backend API, database, and deployment.",
  keywords: ["architecture", "system design", "technical overview", "structure"],
}

export default function ArchitecturePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Badge variant="outline">Technical Overview</Badge>
        <h1 className="text-4xl font-bold tracking-tight">System Architecture</h1>
        <p className="text-lg text-muted-foreground">
          NeoSaaS follows a modular architecture that clearly separates the frontend, backend, and database.
          Discover how the components interact together.
        </p>
      </div>

      {/* System Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            System Diagram
          </CardTitle>
          <CardDescription>Technical architecture overview of NeoSaaS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted">
            <Image
              src="/images/design-mode/tech-stack.png"
              alt="NeoSaaS Technical Architecture Diagram"
              fill
              className="object-contain p-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* Prerequisites */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Prerequisites</AlertTitle>
        <AlertDescription>
          NeoSaaS requires <strong>Next.js 16+</strong> and <strong>Tailwind CSS</strong> to work properly.
        </AlertDescription>
      </Alert>

      {/* Main Components */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Main Components</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Client Layer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Client Layer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">User interface built with React and Next.js 16</p>
              <ul className="space-y-1 text-sm">
                <li>• React pages and components</li>
                <li>• Client state management</li>
                <li>• Next.js App Router routing</li>
                <li>• UI with Tailwind CSS</li>
              </ul>
            </CardContent>
          </Card>

          {/* Backend Layer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Backend / API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Business logic and Next.js API routes</p>
              <ul className="space-y-1 text-sm">
                <li>• Next.js API Routes</li>
                <li>• Server Actions</li>
                <li>• Authentication middleware</li>
                <li>• Data validation</li>
              </ul>
            </CardContent>
          </Card>

          {/* Database Layer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">PostgreSQL with Prisma ORM</p>
              <ul className="space-y-1 text-sm">
                <li>• Integrated Prisma ORM</li>
                <li>• Automatic migrations</li>
                <li>• Neon or local support</li>
                <li>• Type-safe queries</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Database Configuration */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Database Configuration</h2>

        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>PostgreSQL database required</AlertTitle>
          <AlertDescription>
            NeoSaaS uses Prisma ORM to interact with PostgreSQL. You must configure an external
            (Neon) or local database.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Option 1: Neon */}
          <Card>
            <CardHeader>
              <CardTitle>Option 1: Use Neon</CardTitle>
              <CardDescription>Cloud PostgreSQL service (recommended)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-2 text-sm">
                <li>
                  <strong>1. Create an account</strong>
                  <p className="text-muted-foreground">
                    Go to{" "}
                    <Link href="https://neon.tech" className="text-primary hover:underline" target="_blank">
                      neon.tech
                    </Link>{" "}
                    and create a free account
                  </p>
                </li>
                <li>
                  <strong>2. Create a database</strong>
                  <p className="text-muted-foreground">
                    Follow the instructions to create a new PostgreSQL project
                  </p>
                </li>
                <li>
                  <strong>3. Get the connection URL</strong>
                  <p className="text-muted-foreground">Copy the connection string provided by Neon</p>
                </li>
                <li>
                  <strong>4. Configure the environment</strong>
                  <div className="mt-2 rounded-md bg-muted p-3">
                    <code className="text-xs">DATABASE_URL="postgresql://user:password@host:port/database"</code>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Option 2: Local PostgreSQL */}
          <Card>
            <CardHeader>
              <CardTitle>Option 2: Local PostgreSQL</CardTitle>
              <CardDescription>Local installation on your machine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-2 text-sm">
                <li>
                  <strong>1. Install PostgreSQL</strong>
                  <p className="text-muted-foreground">
                    Download and install PostgreSQL from{" "}
                    <Link href="https://postgresql.org" className="text-primary hover:underline" target="_blank">
                      postgresql.org
                    </Link>
                  </p>
                </li>
                <li>
                  <strong>2. Create a database</strong>
                  <div className="mt-2 rounded-md bg-muted p-3">
                    <code className="text-xs">createdb neosaas</code>
                  </div>
                </li>
                <li>
                  <strong>3. Configure the connection URL</strong>
                  <div className="mt-2 rounded-md bg-muted p-3">
                    <code className="text-xs">DATABASE_URL="postgresql://user:password@localhost:5432/neosaas"</code>
                  </div>
                </li>
                <li>
                  <strong>4. Run migrations</strong>
                  <p className="text-muted-foreground">See the next section for Prisma commands</p>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prisma Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Prisma Configuration</CardTitle>
          <CardDescription>
            Prisma ORM is integrated in NeoSaaS. Just run the necessary commands.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Installation Steps</h4>
            <ol className="space-y-3 text-sm">
              <li>
                <strong>1. Install dependencies</strong>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <code className="text-xs">npm install</code>
                </div>
              </li>
              <li>
                <strong>2. Generate Prisma client</strong>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <code className="text-xs">npx prisma generate</code>
                </div>
              </li>
              <li>
                <strong>3. Run migrations</strong>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <code className="text-xs">npx prisma migrate deploy</code>
                </div>
              </li>
              <li>
                <strong>4. (Optional) Seed the database</strong>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <code className="text-xs">npx prisma db seed</code>
                </div>
              </li>
            </ol>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tip</AlertTitle>
            <AlertDescription>
              Use <code className="text-xs">npx prisma studio</code> to visualize and manage your data through a
              web interface.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Deployment Architecture */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Deployment Architecture</h2>

        <Card>
          <CardHeader>
            <CardTitle>Deploying on Vercel</CardTitle>
            <CardDescription>NeoSaaS is optimized for Vercel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              NeoSaaS architecture is designed to be easily deployed on Vercel with the following features:
            </p>
            <ul className="space-y-2 text-sm">
              <li>• Automatic deployment from GitHub</li>
              <li>• Secure environment variables</li>
              <li>• Edge Functions for performance</li>
              <li>• Global CDN for static assets</li>
              <li>• Preview deployments for each commit</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Now that you understand the architecture, here&apos;s what you can do:
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/docs/download"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              → Download NeoSaaS from GitHub
            </Link>
            <Link
              href="/docs/installation"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              → Full installation guide
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              → Back to introduction
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
