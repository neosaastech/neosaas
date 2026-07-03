/**
 * Seeds /features as a page_layers composition (Pilier C — first real page migrated
 * off static JSX, content copied verbatim from the previous static page). Idempotent:
 * skips if /features already has layers.
 */
import { db } from '../db'
import { pageLayers } from '../db/schema'
import { eq } from 'drizzle-orm'

const FEATURE_ITEMS = [
  {
    icon: 'Users',
    title: 'User Management',
    description: 'Comprehensive user management with roles, permissions, and team collaboration.',
    bullets: ['Role-based access control', 'Team management', 'User onboarding flows', 'Profile management'],
  },
  {
    icon: 'CreditCard',
    title: 'Billing & Subscriptions',
    description: 'Flexible billing options with support for multiple payment providers.',
    bullets: ['Subscription management', 'Multiple payment methods', 'Usage-based billing', 'Invoicing and receipts'],
  },
  {
    icon: 'BarChart4',
    title: 'Analytics & Reporting',
    description: 'Powerful analytics to track user behavior and business metrics.',
    bullets: ['User engagement metrics', 'Revenue analytics', 'Custom dashboards', 'Export capabilities'],
  },
  {
    icon: 'Mail',
    title: 'Email Management',
    description: 'Comprehensive email tools for marketing, transactional, and notification emails.',
    bullets: ['Email templates', 'Campaign management', 'Automated workflows', 'Delivery analytics'],
  },
  {
    icon: 'HardDrive',
    title: 'File Storage',
    description: 'Secure file storage and management for your application data.',
    bullets: ['Cloud storage integration', 'File organization', 'Access controls', 'Version history'],
  },
  {
    icon: 'Shield',
    title: 'Security & Compliance',
    description: 'Enterprise-grade security features to protect your data.',
    bullets: ['Two-factor authentication', 'Data encryption', 'GDPR compliance tools', 'Security auditing'],
  },
  {
    icon: 'FileText',
    title: 'Documentation',
    description: 'Comprehensive documentation for users and developers.',
    bullets: ['User guides', 'API documentation', 'Integration tutorials', 'Knowledge base'],
  },
  {
    icon: 'Clock',
    title: 'Task Scheduler',
    description: 'Automate recurring tasks and background processes.',
    bullets: ['Scheduled jobs', 'Recurring tasks', 'Workflow automation', 'Execution history'],
  },
]

async function seedPageLayers() {
  const existing = await db.select().from(pageLayers).where(eq(pageLayers.pagePath, '/features')).limit(1)
  if (existing.length > 0) {
    console.log('  ℹ️  /features already has layers')
    process.exit(0)
  }

  await db.insert(pageLayers).values([
    {
      pagePath: '/features',
      position: 0,
      layerType: 'hero',
      props: {
        title: 'Everything you need to run your SaaS',
        subtitle:
          'NeoSaaS provides all the tools and features you need to build, launch, and scale your SaaS business.',
      },
    },
    {
      pagePath: '/features',
      position: 1,
      layerType: 'feature-grid',
      props: { items: FEATURE_ITEMS },
    },
  ])

  console.log('  ✓ /features layers seeded (hero + feature-grid)')
  process.exit(0)
}

seedPageLayers().catch((error) => {
  console.error('  ❌ Page layers seeding failed:', error)
  process.exit(1)
})
