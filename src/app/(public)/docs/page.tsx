import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Book, FileText, Layers, Lightbulb, Settings, Zap } from "lucide-react"

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

      <div className="flex flex-col md:flex-row gap-4 md:items-center bg-[#CD7F32]/10 border border-[#CD7F32]/20 rounded-lg p-4">
        <div className="flex-1">
          <h3 className="font-semibold text-[#CD7F32]">New in NeoSaaS v2.0</h3>
          <p className="text-sm text-muted-foreground">
            Explore our latest features including multi-region support, enhanced analytics, and improved API
            performance.
          </p>
        </div>
        <Link href="/docs/whats-new">
          <Button variant="outline" className="border-[#CD7F32] text-[#CD7F32] hover:bg-[#CD7F32]/10">
            What's New <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <Link href="/docs/configuration" className="text-muted-foreground hover:text-foreground">
                  Configuration
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#CD7F32]" />
              <CardTitle>Core Concepts</CardTitle>
            </div>
            <CardDescription>Learn about the fundamental concepts of NeoSaaS</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/docs/core-concepts/user-management"
                  className="text-muted-foreground hover:text-foreground"
                >
                  User Management
                </Link>
              </li>
              <li>
                <Link href="/docs/core-concepts/billing" className="text-muted-foreground hover:text-foreground">
                  Billing & Subscriptions
                </Link>
              </li>
              <li>
                <Link href="/docs/core-concepts/analytics" className="text-muted-foreground hover:text-foreground">
                  Analytics
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#CD7F32]" />
              <CardTitle>API Reference</CardTitle>
            </div>
            <CardDescription>Comprehensive API documentation for developers</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs/api-reference/authentication" className="text-muted-foreground hover:text-foreground">
                  Authentication
                </Link>
              </li>
              <li>
                <Link href="/docs/api-reference/users" className="text-muted-foreground hover:text-foreground">
                  Users API
                </Link>
              </li>
              <li>
                <Link href="/docs/api-reference/payments" className="text-muted-foreground hover:text-foreground">
                  Payments API
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#CD7F32]" />
              <CardTitle>Guides</CardTitle>
            </div>
            <CardDescription>Step-by-step guides for common tasks and integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs/guides/custom-integrations" className="text-muted-foreground hover:text-foreground">
                  Custom Integrations
                </Link>
              </li>
              <li>
                <Link href="/docs/guides/white-labeling" className="text-muted-foreground hover:text-foreground">
                  White Labeling
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-[#CD7F32]" />
              <CardTitle>Best Practices</CardTitle>
            </div>
            <CardDescription>Recommendations for getting the most out of NeoSaaS</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs/best-practices" className="text-muted-foreground hover:text-foreground">
                  Overview
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#CD7F32]" />
              <CardTitle>Advanced Configuration</CardTitle>
            </div>
            <CardDescription>Detailed configuration options for power users</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs/advanced-configuration" className="text-muted-foreground hover:text-foreground">
                  Overview
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                <Link href="/docs/core-concepts/user-management" className="text-sm hover:underline">
                  User Management and Authentication
                </Link>
                <Badge variant="outline">Essential</Badge>
              </li>
              <li className="flex items-center justify-between">
                <Link href="/docs/api-reference/authentication" className="text-sm hover:underline">
                  API Authentication Guide
                </Link>
                <Badge variant="outline">Developer</Badge>
              </li>
              <li className="flex items-center justify-between">
                <Link href="/docs/guides/custom-integrations" className="text-sm hover:underline">
                  Building Custom Integrations
                </Link>
                <Badge variant="outline">Advanced</Badge>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>Resources for additional support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-[#CD7F32]/10 p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#CD7F32]"
                >
                  <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
                  <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium">Community Forum</h4>
                <p className="text-xs text-muted-foreground">
                  Join our community forum to ask questions and connect with other users.
                </p>
                <Link href="#" className="text-xs text-[#CD7F32] hover:underline">
                  Visit Forum →
                </Link>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-[#CD7F32]/10 p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#CD7F32]"
                >
                  <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium">GitHub</h4>
                <p className="text-xs text-muted-foreground">
                  Report issues, contribute, or explore our open source components.
                </p>
                <Link href="#" className="text-xs text-[#CD7F32] hover:underline">
                  View GitHub →
                </Link>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-[#CD7F32]/10 p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#CD7F32]"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium">Contact Support</h4>
                <p className="text-xs text-muted-foreground">
                  Get in touch with our support team for personalized assistance.
                </p>
                <Link href="#" className="text-xs text-[#CD7F32] hover:underline">
                  Contact Us →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
