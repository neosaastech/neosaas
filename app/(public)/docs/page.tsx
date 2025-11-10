import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Book } from "lucide-react"
import Image from "next/image"

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
            <span className="text-foreground">Neo</span>
            <span className="text-[#CD7F32]">SaaS</span> Documentation
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Everything you need to build, launch, and scale your SaaS business
          </p>
        </div>
        <div className="hidden md:flex items-center justify-center bg-[#CD7F32]/10 rounded-full p-6 h-24 w-24">
          <div className="font-bold text-2xl tracking-tight">
            <span className="text-foreground">N</span>
            <span className="text-[#CD7F32]">S</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 border-t pt-6">
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-3xl font-bold tracking-tight">Introduction</h2>
          <p className="text-lg text-muted-foreground">
            NeoSaaS is a modern full-stack SaaS boilerplate built with the latest web technologies. It provides
            everything you need to build, launch, and scale your SaaS application with industry best practices built-in.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">What is NeoSaaS?</h3>
          <p className="text-muted-foreground">
            NeoSaaS is an opinionated way of building full-stack web applications. It takes care of all three major
            parts of a web application: client (front-end), server (back-end), and database. Built on top of proven
            technologies, NeoSaaS handles the complexity of connecting all parts of your stack.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Built on Modern Technologies</h3>
          <p className="text-muted-foreground mb-6">
            NeoSaaS uses Next.js, Prisma, and leading authentication and database solutions under the hood. This allows
            you to focus on building features while NeoSaaS handles the infrastructure.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Image
                  src="/images/design-mode/OIP.mJ5m2pvYDrgXgQV26fLoDQHaGp.webp"
                  alt="Next.js"
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Next.js 16</h4>
                <p className="text-xs text-muted-foreground">React Framework</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Image
                  src="/images/design-mode/OIP.UOCNslnMZiDcU4dXrJDeqwHaH0.webp"
                  alt="Prisma"
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Prisma</h4>
                <p className="text-xs text-muted-foreground">Database ORM</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Image
                  src="/images/design-mode/OIP.rMNgqM_B76VzXugyzHZt0QHaEB.webp"
                  alt="Neon"
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Neon</h4>
                <p className="text-xs text-muted-foreground">Serverless Postgres</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Image
                  src="/images/design-mode/OIP.NZCHYfcUrSHlM7-QtwCwWAHaHa.webp"
                  alt="Better Auth"
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Better Auth</h4>
                <p className="text-xs text-muted-foreground">Authentication</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Image
                  src="/images/design-mode/OIP.dVVJ2i1BrGFxU5GBBuzyPAHaHa.webp"
                  alt="Resend"
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Resend</h4>
                <p className="text-xs text-muted-foreground">Transactional Emails</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">What's Included?</h3>
          <p className="text-muted-foreground">NeoSaaS comes with everything you need to launch your SaaS:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Authentication and authorization with Better Auth</li>
            <li>Database integration with Prisma ORM and PostgreSQL</li>
            <li>Responsive UI components built with Tailwind CSS and shadcn/ui</li>
            <li>Admin dashboard with analytics and user management</li>
            <li>Transactional emails with Resend API and Nodemailer for basic SMTP</li>
            <li>API routes and server actions for backend logic</li>
            <li>Type-safe development with TypeScript</li>
            <li>Modern styling with Tailwind CSS v4</li>
            <li>Production-ready deployment configuration</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">When to Use NeoSaaS</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Best Used For</h4>
              <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                <li>Building full-stack SaaS applications</li>
                <li>Starting projects with industry best practices</li>
                <li>Rapid MVP development</li>
                <li>Projects requiring authentication and database</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-yellow-600">Consider Alternatives For</h4>
              <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                <li>Static websites or landing pages</li>
                <li>No-code solution requirements</li>
                <li>Non-JavaScript/TypeScript projects</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h2 className="text-2xl font-bold tracking-tight">Project Structure</h2>
          <p className="text-muted-foreground">
            NeoSaaS follows a clean and organized folder structure to keep your code maintainable and scalable.
          </p>
          <div className="rounded-lg border bg-card p-6">
            <pre className="text-sm overflow-x-auto">
              <code>{`src
├── app
│   ├── (auth)
│   │   ├── layout.tsx
│   │   ├── sign-in
│   │   │   └── page.tsx
│   │   └── sign-up
│   │       └── page.tsx
│   ├── (protected)
│   │   ├── dashboard
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api
│   │   └── auth
│   │       └── [...all]
│   │           └── route.ts
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components
│   ├── forms
│   │   ├── sign-in-form.tsx
│   │   └── sign-up-form.tsx
│   └── ui
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── config
└── lib
    ├── auth-client.ts
    ├── auth.ts
    └── prisma.ts

15 directories, 18 files`}</code>
            </pre>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center bg-[#CD7F32]/10 border border-[#CD7F32]/20 rounded-lg p-4">
        <div className="flex-1">
          <h3 className="font-semibold text-[#CD7F32]">Ready to Get Started?</h3>
          <p className="text-sm text-muted-foreground">
            Follow our installation guide to set up NeoSaaS in your Next.js project.
          </p>
        </div>
        <Link href="/docs/installation">
          <Button variant="outline" className="border-[#CD7F32] text-[#CD7F32] hover:bg-[#CD7F32]/10 bg-transparent">
            View Installation Guide <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-[#CD7F32]" />
              <CardTitle>Getting Started</CardTitle>
            </div>
            <CardDescription>Everything you need to get up and running with NeoSaaS</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs" className="text-[#CD7F32] hover:underline">
                  Introduction
                </Link>
              </li>
              <li>
                <Link href="/docs/installation" className="text-muted-foreground hover:text-foreground">
                  Installation
                </Link>
              </li>
              <li>
                <Link href="/docs/download" className="text-muted-foreground hover:text-foreground">
                  Download from GitHub
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
            <CardDescription>Most frequently visited documentation</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center justify-between">
                <Link href="/docs/installation" className="text-sm hover:underline">
                  Getting Started with NeoSaaS
                </Link>
                <Badge variant="outline">Beginner</Badge>
              </li>
              <li className="flex items-center justify-between">
                <Link href="/docs/download" className="text-sm hover:underline">
                  Download Latest Version from GitHub
                </Link>
                <Badge variant="outline">Essential</Badge>
              </li>
              <li className="flex items-center justify-between">
                <Link href="/docs/architecture" className="text-sm hover:underline">
                  Understanding the Architecture
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
