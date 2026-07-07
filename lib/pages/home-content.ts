export const HOME_FEATURE_ITEMS = [
  {
    icon: "Users",
    title: "User Management",
    description: "Comprehensive user management with roles, permissions, and team collaboration.",
    bullets: [],
  },
  {
    icon: "CreditCard",
    title: "Billing & Subscriptions",
    description: "Flexible billing options with support for multiple payment providers.",
    bullets: [],
  },
  {
    icon: "BarChart4",
    title: "Analytics & Reporting",
    description: "Powerful analytics to track user behavior and business metrics.",
    bullets: [],
  },
  {
    icon: "Globe",
    title: "Multi-region Support",
    description: "Deploy your application globally with multi-region support and CDN integration.",
    bullets: [],
  },
  {
    icon: "Shield",
    title: "Security & Compliance",
    description: "Enterprise-grade security features to protect your data and meet compliance requirements.",
    bullets: [],
  },
  {
    icon: "Zap",
    title: "API Integration",
    description: "Powerful API integration capabilities to connect with your existing tools and services.",
    bullets: [],
  },
]

export const HOME_TESTIMONIALS = [
  {
    body: "NeoSaaS has transformed our business completely. The user management and billing features have saved us countless hours of work.",
    authorName: "Jane Smith",
    authorRole: "CEO, TechCorp",
    imageUrl: "/images/design-mode/44.jpg",
    rating: 5,
  },
  {
    body: "The analytics and reporting features have given us insights we never had before. We can now make data-driven decisions with confidence.",
    authorName: "John Doe",
    authorRole: "CTO, Innovate Inc.",
    imageUrl: "/images/design-mode/32.jpg",
    rating: 5,
  },
  {
    body: "Setting up our subscription model was a breeze with NeoSaaS. The platform is intuitive and the support team is always there when we need them.",
    authorName: "Sarah Johnson",
    authorRole: "Founder, StartUp Labs",
    imageUrl: "/images/design-mode/68.jpg",
    rating: 5,
  },
]

export function buildHomeLayers(locale: string) {
  return [
    {
      pagePath: "/",
      locale,
      position: 0,
      layerType: "hero",
      props: {
    eyebrow: "New Features Available",
    title: "The Complete SaaS Platform for Modern Businesses",
    subtitle:
      "NeoSaaS provides all the tools you need to build, launch, and scale your SaaS business. Start your journey today.",
    trustPills: [
      { icon: "Shield", label: "Enterprise security" },
      { icon: "Zap", label: "Fast to deploy" },
      { icon: "Globe", label: "Multi-tenant ready" },
    ],
    ctaLabel: "Get Started",
        ctaHref: "/auth/register",
        secondaryCtaLabel: "View Pricing",
        secondaryCtaHref: `/${locale}/pricing`,
      },
    },
    {
      pagePath: "/",
      locale,
      position: 1,
      layerType: "feature-grid",
      props: {
        eyebrow: "Core Features",
        title: "Everything You Need",
        items: HOME_FEATURE_ITEMS,
      },
    },
    {
      pagePath: "/",
      locale,
      position: 2,
      layerType: "testimonials",
      props: {
        eyebrow: "Testimonials",
        title: "Trusted by Businesses Worldwide",
        items: HOME_TESTIMONIALS,
      },
    },
    {
      pagePath: "/",
      locale,
      position: 3,
      layerType: "cta-banner",
      props: {
        title: "Ready to Get Started?",
        subtitle: "Join thousands of businesses already growing with NeoSaaS. Start your 14-day free trial today.",
        ctaLabel: "Start Free Trial",
        ctaHref: "/auth/register",
      },
    },
  ]
}
