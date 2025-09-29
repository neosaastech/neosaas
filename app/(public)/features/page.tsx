import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart4, Clock, CreditCard, FileText, HardDrive, Mail, Shield, Users } from "lucide-react"

export default function FeaturesPage() {
  return (
    <div className="container py-12 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Everything you need to run your SaaS
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          NeoSaaS provides all the tools and features you need to build, launch, and scale your SaaS business.
        </p>
      </div>

      <div className="mx-auto mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Users className="h-10 w-10 text-primary mb-4" />
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Comprehensive user management with roles, permissions, and team collaboration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Role-based access control</li>
              <li>Team management</li>
              <li>User onboarding flows</li>
              <li>Profile management</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CreditCard className="h-10 w-10 text-primary mb-4" />
            <CardTitle>Billing & Subscriptions</CardTitle>
            <CardDescription>Flexible billing options with support for multiple payment providers.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Subscription management</li>
              <li>Multiple payment methods</li>
              <li>Usage-based billing</li>
              <li>Invoicing and receipts</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BarChart4 className="h-10 w-10 text-primary mb-4" />
            <CardTitle>Analytics & Reporting</CardTitle>
            <CardDescription>Powerful analytics to track user behavior and business metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>User engagement metrics</li>
              <li>Revenue analytics</li>
              <li>Custom dashboards</li>
              <li>Export capabilities</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Mail className="h-10 w-10 text-primary mb-4" />
            <CardTitle>Email Management</CardTitle>
            <CardDescription>
              Comprehensive email tools for marketing, transactional, and notification emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Email templates</li>
              <li>Campaign management</li>
              <li>Automated workflows</li>
              <li>Delivery analytics</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <HardDrive className="h-10 w-10 text-primary mb-4" />
            <CardTitle>File Storage</CardTitle>
            <CardDescription>Secure file storage and management for your application data.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Cloud storage integration</li>
              <li>File organization</li>
              <li>Access controls</li>
              <li>Version history</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-10 w-10 text-primary mb-4" />
            <CardTitle>Security & Compliance</CardTitle>
            <CardDescription>Enterprise-grade security features to protect your data.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Two-factor authentication</li>
              <li>Data encryption</li>
              <li>GDPR compliance tools</li>
              <li>Security auditing</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-10 w-10 text-primary mb-4" />
            <CardTitle>Documentation</CardTitle>
            <CardDescription>Comprehensive documentation for users and developers.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>User guides</li>
              <li>API documentation</li>
              <li>Integration tutorials</li>
              <li>Knowledge base</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Clock className="h-10 w-10 text-primary mb-4" />
            <CardTitle>Task Scheduler</CardTitle>
            <CardDescription>Automate recurring tasks and background processes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Scheduled jobs</li>
              <li>Recurring tasks</li>
              <li>Workflow automation</li>
              <li>Execution history</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
