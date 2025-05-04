import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart4, Clock, CreditCard, FileText, HardDrive, Mail, Shield, Users } from "lucide-react"

export function FeatureGrid() {
  const features = [
    {
      icon: <Users className="h-10 w-10 text-primary mb-4" />,
      title: "User Management",
      description: "Comprehensive user management with roles, permissions, and team collaboration.",
      items: ["Role-based access control", "Team management", "User onboarding flows", "Profile management"],
    },
    {
      icon: <CreditCard className="h-10 w-10 text-primary mb-4" />,
      title: "Billing & Subscriptions",
      description: "Flexible billing options with support for multiple payment providers.",
      items: ["Subscription management", "Multiple payment methods", "Usage-based billing", "Invoicing and receipts"],
    },
    {
      icon: <BarChart4 className="h-10 w-10 text-primary mb-4" />,
      title: "Analytics & Reporting",
      description: "Powerful analytics to track user behavior and business metrics.",
      items: ["User engagement metrics", "Revenue analytics", "Custom dashboards", "Export capabilities"],
    },
    {
      icon: <Mail className="h-10 w-10 text-primary mb-4" />,
      title: "Email Management",
      description: "Comprehensive email tools for marketing, transactional, and notification emails.",
      items: ["Email templates", "Campaign management", "Automated workflows", "Delivery analytics"],
    },
    {
      icon: <HardDrive className="h-10 w-10 text-primary mb-4" />,
      title: "File Storage",
      description: "Secure file storage and management for your application data.",
      items: ["Cloud storage integration", "File organization", "Access controls", "Version history"],
    },
    {
      icon: <Shield className="h-10 w-10 text-primary mb-4" />,
      title: "Security & Compliance",
      description: "Enterprise-grade security features to protect your data.",
      items: ["Two-factor authentication", "Data encryption", "GDPR compliance tools", "Security auditing"],
    },
    {
      icon: <FileText className="h-10 w-10 text-primary mb-4" />,
      title: "Documentation",
      description: "Comprehensive documentation for users and developers.",
      items: ["User guides", "API documentation", "Integration tutorials", "Knowledge base"],
    },
    {
      icon: <Clock className="h-10 w-10 text-primary mb-4" />,
      title: "Task Scheduler",
      description: "Automate recurring tasks and background processes.",
      items: ["Scheduled jobs", "Recurring tasks", "Workflow automation", "Execution history"],
    },
  ]

  return (
    <div className="mx-auto mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, index) => (
        <Card key={index}>
          <CardHeader>
            {feature.icon}
            <CardTitle>{feature.title}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              {feature.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
