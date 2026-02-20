import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Book } from 'lucide-react'
import Image from "next/image"

export const metadata = {
  title: "Documentation",
  description: "NeoSaaS documentation: everything you need to build, launch, and scale your SaaS business. Installation guides, architecture, and API references.",
  keywords: ["documentation", "docs", "guide", "tutorial", "API", "installation"],
}

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
            <span className="text-foreground">Neo</span>
            <span className="text-brand">SaaS</span> Documentation
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Everything you need to build, launch, and scale your SaaS business
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
            NeoSaaS uses Next.js, Drizzle ORM, and leading authentication, database, payment, and email solutions under the hood. This allows
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

            <Link href="https://orm.drizzle.team" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Image
                  src="/images/drizzle-logo.webp"
                  alt="Drizzle ORM"
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Drizzle ORM</h4>
                <p className="text-xs text-muted-foreground">Type-safe Database ORM</p>
              </div>
            </Link>

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

            <Link href="https://auth0.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-20 h-20">
                  <path d="M21.98 7.448L19.62 0H12.017l2.387 7.448h7.576zm-10.662 0L13.705 0H6.102L3.715 7.448h7.603zm7.173 2.544h-7.576l-2.387 7.448h7.576l2.387-7.448zm-10.662 0H.232l2.387 7.448h7.603l-2.387-7.448zm5.285 6.921l-2.387 7.087 6.102.001 2.387-7.088h-6.102z" fill="#EB5424"/>
                </svg>
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Auth0</h4>
                <p className="text-xs text-muted-foreground">Authentication</p>
              </div>
            </Link>

            <Link href="https://resend.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
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
                <p className="text-xs text-muted-foreground">Email API</p>
              </div>
            </Link>

            <Link href="https://aws.amazon.com/ses/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Image
                  src="/images/amazon-ses-logo.webp"
                  alt="Amazon SES"
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Amazon SES</h4>
                <p className="text-xs text-muted-foreground">Transactional Emails</p>
              </div>
            </Link>

            <Link href="https://www.scaleway.com/en/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-20 h-20">
                  <circle cx="100" cy="100" r="100" fill="#4F0599"/>
                  <path d="M60 90 L90 60 L90 90 L120 90 L120 60 L150 90 L120 120 L120 90 L90 90 L90 120 Z" fill="white" stroke="white" strokeWidth="8" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Scaleway</h4>
                <p className="text-xs text-muted-foreground">Cloud Infrastructure</p>
              </div>
            </Link>

            <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Image
                  src="/images/lago-logo.webp"
                  alt="Lago"
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h4 className="font-semibold">Lago</h4>
                <p className="text-xs text-muted-foreground">Embedded Billing</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                  <Badge variant="secondary" className="text-[10px] px-2 py-1 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#003087">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.121.768h4.605a.952.952 0 0 0 .943-.803l.03-.164 1.048-6.647.034-.184a.952.952 0 0 1 .943-.803h.593c3.853 0 6.867-1.565 7.747-6.09.036-.188.068-.372.096-.551z"/>
                    </svg>
                    PayPal
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] px-2 py-1 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#635BFF">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                    Stripe
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">What's Included?</h3>
          <p className="text-muted-foreground">NeoSaaS comes with everything you need to launch your SaaS:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Authentication and authorization with Auth0</li>
            <li>Database integration with Drizzle ORM and PostgreSQL</li>
            <li>Responsive UI components built with Tailwind CSS and shadcn/ui</li>
            <li>Admin dashboard with analytics and user management</li>
            <li>Transactional emails with Resend or Amazon SES</li>
            <li>Embedded billing and subscription management with Lago</li>
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

      <div className="flex flex-col md:flex-row gap-4 md:items-center bg-brand/10 border border-brand/20 rounded-lg p-4">
        <div className="flex-1">
          <h3 className="font-semibold text-brand">Ready to Get Started?</h3>
          <p className="text-sm text-muted-foreground">
            Follow our installation guide to set up NeoSaaS in your Next.js project.
          </p>
        </div>
        <Link href="/docs/installation">
          <Button variant="outline" className="border-brand text-brand hover:bg-brand/10 bg-transparent">
            View Installation Guide <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-brand" />
              <CardTitle>Getting Started</CardTitle>
            </div>
            <CardDescription>Everything you need to get up and running with NeoSaaS</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs" className="text-brand hover:underline">
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
