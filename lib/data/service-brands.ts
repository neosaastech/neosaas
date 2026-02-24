/**
 * Service Brands - Hierarchical Brand/Service/API Definitions
 * 
 * Structure: Brand → Services → API Types
 * Example: GitHub → [OAuth, REST API, CLI] 
 */

export type ServiceCategory = 
  | 'authentication' 
  | 'cloud' 
  | 'payment' 
  | 'email' 
  | 'storage' 
  | 'communication'
  | 'development'
  | 'analytics'

export type ApiType = 
  | 'oauth' 
  | 'rest' 
  | 'graphql' 
  | 'cli' 
  | 'webhook' 
  | 'sdk'

export interface ServiceApiDefinition {
  id: string
  name: string
  slug: string
  description: string
  apiType: ApiType
  documentationUrl: string
  requiredFields: {
    name: string
    label: string
    type: 'text' | 'password' | 'url' | 'select'
    placeholder?: string
    required: boolean
    helpText?: string
    options?: { value: string; label: string }[]
  }[]
  testable: boolean // Can this API be tested via a test endpoint?
  metadata?: Record<string, any>
}

export interface ServiceBrandDefinition {
  id: string
  name: string
  slug: string
  description: string
  logoUrl: string // Path to logo in /public or external URL
  logoComponent?: 'svg' | 'image' | 'icon' // How to render the logo
  websiteUrl: string
  category: ServiceCategory
  apis: ServiceApiDefinition[]
  isActive: boolean
  sortOrder: number
}

/**
 * Centralized Brand/Service Registry
 * All external service integrations are defined here
 */
export const SERVICE_BRANDS: ServiceBrandDefinition[] = [
  // =============================================================================
  // AUTHENTICATION PROVIDERS
  // =============================================================================
  {
    id: 'github',
    name: 'GitHub',
    slug: 'github',
    description: 'Code hosting platform with OAuth and comprehensive APIs',
    logoUrl: '/images/brands/github-logo.svg',
    logoComponent: 'svg',
    websiteUrl: 'https://github.com',
    category: 'authentication',
    isActive: true,
    sortOrder: 1,
    apis: [
      {
        id: 'github-oauth',
        name: 'OAuth Authentication',
        slug: 'oauth',
        description: 'GitHub OAuth 2.0 for user authentication',
        apiType: 'oauth',
        documentationUrl: 'https://docs.github.com/en/developers/apps/building-oauth-apps',
        testable: true,
        requiredFields: [
          {
            name: 'clientId',
            label: 'Client ID',
            type: 'text',
            placeholder: 'Ov23li...',
            required: true,
            helpText: 'Found in GitHub OAuth App settings',
          },
          {
            name: 'clientSecret',
            label: 'Client Secret',
            type: 'password',
            placeholder: '***',
            required: true,
            helpText: 'Generated when creating OAuth App',
          },
          {
            name: 'redirectUri',
            label: 'Redirect URI',
            type: 'url',
            placeholder: 'https://yourdomain.com/api/auth/oauth/github/callback',
            required: true,
            helpText: 'Must match GitHub OAuth App configuration',
          },
        ],
      },
      {
        id: 'github-api',
        name: 'REST API (Personal Access Token)',
        slug: 'rest-api',
        description: 'Access GitHub repositories, issues, pull requests via REST',
        apiType: 'rest',
        documentationUrl: 'https://docs.github.com/en/rest',
        testable: true,
        requiredFields: [
          {
            name: 'personalAccessToken',
            label: 'Personal Access Token',
            type: 'password',
            placeholder: 'ghp_...',
            required: true,
            helpText: 'Generate at: Settings → Developer settings → Personal access tokens',
          },
        ],
      },
    ],
  },

  {
    id: 'google',
    name: 'Google',
    slug: 'google',
    description: 'Google Cloud Platform services and APIs',
    logoUrl: '/images/brands/google-logo.svg',
    logoComponent: 'svg',
    websiteUrl: 'https://cloud.google.com',
    category: 'authentication',
    isActive: true,
    sortOrder: 2,
    apis: [
      {
        id: 'google-oauth',
        name: 'OAuth 2.0 Authentication',
        slug: 'oauth',
        description: 'Google OAuth 2.0 for user login',
        apiType: 'oauth',
        documentationUrl: 'https://developers.google.com/identity/protocols/oauth2',
        testable: true,
        requiredFields: [
          {
            name: 'clientId',
            label: 'Client ID',
            type: 'text',
            placeholder: '123456789012-abc...apps.googleusercontent.com',
            required: true,
            helpText: 'Found in Google Cloud Console → Credentials',
          },
          {
            name: 'clientSecret',
            label: 'Client Secret',
            type: 'password',
            placeholder: 'GOCSPX-...',
            required: true,
          },
          {
            name: 'redirectUri',
            label: 'Redirect URI',
            type: 'url',
            placeholder: 'https://yourdomain.com/api/auth/oauth/google/callback',
            required: true,
          },
        ],
      },
      {
        id: 'google-calendar',
        name: 'Google Calendar API',
        slug: 'calendar',
        description: 'Manage calendars and events',
        apiType: 'rest',
        documentationUrl: 'https://developers.google.com/calendar/api',
        testable: true,
        requiredFields: [
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
          },
          {
            name: 'serviceAccountEmail',
            label: 'Service Account Email',
            type: 'text',
            required: false,
          },
        ],
      },
    ],
  },

  // =============================================================================
  // PAYMENT PROVIDERS
  // =============================================================================
  {
    id: 'stripe',
    name: 'Stripe',
    slug: 'stripe',
    description: 'Payment processing platform',
    logoUrl: '/images/stripe-logo.png',
    logoComponent: 'image',
    websiteUrl: 'https://stripe.com',
    category: 'payment',
    isActive: true,
    sortOrder: 10,
    apis: [
      {
        id: 'stripe-payments',
        name: 'Payment Processing',
        slug: 'payments',
        description: 'Accept payments via Stripe API',
        apiType: 'rest',
        documentationUrl: 'https://stripe.com/docs/api',
        testable: true,
        requiredFields: [
          {
            name: 'publicKey',
            label: 'Publishable Key',
            type: 'text',
            placeholder: 'pk_test_...',
            required: true,
            helpText: 'Safe to expose in frontend',
          },
          {
            name: 'secretKey',
            label: 'Secret Key',
            type: 'password',
            placeholder: 'sk_test_...',
            required: true,
            helpText: 'Never expose this key',
          },
          {
            name: 'webhookSecret',
            label: 'Webhook Secret',
            type: 'password',
            placeholder: 'whsec_...',
            required: false,
            helpText: 'For webhook signature verification',
          },
        ],
      },
    ],
  },

  {
    id: 'paypal',
    name: 'PayPal',
    slug: 'paypal',
    description: 'Online payment platform',
    logoUrl: '/images/paypal-logo.png',
    logoComponent: 'image',
    websiteUrl: 'https://paypal.com',
    category: 'payment',
    isActive: true,
    sortOrder: 11,
    apis: [
      {
        id: 'paypal-checkout',
        name: 'Checkout & Payments',
        slug: 'checkout',
        description: 'PayPal payment integration',
        apiType: 'rest',
        documentationUrl: 'https://developer.paypal.com/docs/api',
        testable: true,
        requiredFields: [
          {
            name: 'clientId',
            label: 'Client ID',
            type: 'text',
            required: true,
          },
          {
            name: 'clientSecret',
            label: 'Client Secret',
            type: 'password',
            required: true,
          },
          {
            name: 'webhookId',
            label: 'Webhook ID',
            type: 'text',
            required: false,
          },
        ],
      },
    ],
  },

  {
    id: 'lago',
    name: 'Lago',
    slug: 'lago',
    description: 'Open-source billing platform',
    logoUrl: '/images/brands/lago-logo.svg',
    logoComponent: 'svg',
    websiteUrl: 'https://getlago.com',
    category: 'payment',
    isActive: true,
    sortOrder: 12,
    apis: [
      {
        id: 'lago-billing',
        name: 'Billing & Subscriptions',
        slug: 'billing',
        description: 'Usage-based billing and metering',
        apiType: 'rest',
        documentationUrl: 'https://doc.getlago.com',
        testable: true,
        requiredFields: [
          {
            name: 'apiUrl',
            label: 'API URL',
            type: 'url',
            placeholder: 'https://api.lago.com/api/v1',
            required: true,
          },
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
          },
        ],
      },
    ],
  },

  // =============================================================================
  // EMAIL PROVIDERS
  // =============================================================================
  {
    id: 'resend',
    name: 'Resend',
    slug: 'resend',
    description: 'Transactional email API',
    logoUrl: '/images/brands/resend-logo.svg',
    logoComponent: 'svg',
    websiteUrl: 'https://resend.com',
    category: 'email',
    isActive: true,
    sortOrder: 20,
    apis: [
      {
        id: 'resend-email',
        name: 'Email Delivery',
        slug: 'email',
        description: 'Send transactional emails',
        apiType: 'rest',
        documentationUrl: 'https://resend.com/docs',
        testable: true,
        requiredFields: [
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            placeholder: 're_...',
            required: true,
          },
          {
            name: 'domain',
            label: 'Verified Domain',
            type: 'text',
            placeholder: 'yourdomain.com',
            required: false,
            helpText: 'Optional: Sender domain',
          },
        ],
      },
    ],
  },

  {
    id: 'aws',
    name: 'Amazon Web Services',
    slug: 'aws',
    description: 'Cloud computing services',
    logoUrl: '/images/brands/aws-logo.svg',
    logoComponent: 'svg',
    websiteUrl: 'https://aws.amazon.com',
    category: 'cloud',
    isActive: true,
    sortOrder: 30,
    apis: [
      {
        id: 'aws-ses',
        name: 'Simple Email Service (SES)',
        slug: 'ses',
        description: 'Email sending via AWS',
        apiType: 'rest',
        documentationUrl: 'https://docs.aws.amazon.com/ses',
        testable: true,
        requiredFields: [
          {
            name: 'accessKeyId',
            label: 'Access Key ID',
            type: 'text',
            required: true,
          },
          {
            name: 'secretAccessKey',
            label: 'Secret Access Key',
            type: 'password',
            required: true,
          },
          {
            name: 'region',
            label: 'AWS Region',
            type: 'select',
            required: true,
            options: [
              { value: 'us-east-1', label: 'US East (N. Virginia)' },
              { value: 'us-west-2', label: 'US West (Oregon)' },
              { value: 'eu-west-1', label: 'Europe (Ireland)' },
              { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
            ],
          },
          {
            name: 'sessionToken',
            label: 'Session Token (Optional)',
            type: 'password',
            required: false,
          },
        ],
      },
    ],
  },

  // =============================================================================
  // STORAGE & INFRASTRUCTURE
  // =============================================================================
  {
    id: 'scaleway',
    name: 'Scaleway',
    slug: 'scaleway',
    description: 'European cloud provider',
    logoUrl: '/images/brands/scaleway-logo.svg',
    logoComponent: 'svg',
    websiteUrl: 'https://scaleway.com',
    category: 'cloud',
    isActive: true,
    sortOrder: 40,
    apis: [
      {
        id: 'scaleway-tem',
        name: 'Transactional Email (TEM)',
        slug: 'tem',
        description: 'Email sending service',
        apiType: 'rest',
        documentationUrl: 'https://www.scaleway.com/en/docs/managed-services/transactional-email',
        testable: true,
        requiredFields: [
          {
            name: 'secretKey',
            label: 'Secret Key',
            type: 'password',
            required: true,
            helpText: 'API Secret Key for TEM',
          },
          {
            name: 'projectId',
            label: 'Project ID',
            type: 'text',
            required: true,
            helpText: 'Scaleway Project ID',
          },
          {
            name: 'accessKey',
            label: 'Access Key (Optional)',
            type: 'text',
            required: false,
            helpText: 'Not used by TEM API',
          },
        ],
      },
      {
        id: 'scaleway-storage',
        name: 'Object Storage',
        slug: 'storage',
        description: 'S3-compatible object storage',
        apiType: 'rest',
        documentationUrl: 'https://www.scaleway.com/en/docs/storage/object',
        testable: false,
        requiredFields: [
          {
            name: 'accessKey',
            label: 'Access Key',
            type: 'text',
            required: true,
          },
          {
            name: 'secretKey',
            label: 'Secret Key',
            type: 'password',
            required: true,
          },
          {
            name: 'region',
            label: 'Region',
            type: 'select',
            required: true,
            options: [
              { value: 'fr-par', label: 'Paris' },
              { value: 'nl-ams', label: 'Amsterdam' },
              { value: 'pl-waw', label: 'Warsaw' },
            ],
          },
        ],
      },
    ],
  },
]

/**
 * Helper functions to work with service brands
 */
export const getServiceBrandBySlug = (slug: string): ServiceBrandDefinition | undefined => {
  return SERVICE_BRANDS.find(brand => brand.slug === slug)
}

export const getServiceApiById = (brandSlug: string, apiId: string): ServiceApiDefinition | undefined => {
  const brand = getServiceBrandBySlug(brandSlug)
  return brand?.apis.find(api => api.id === apiId)
}

export const getServiceBrandsByCategory = (category: ServiceCategory): ServiceBrandDefinition[] => {
  return SERVICE_BRANDS.filter(brand => brand.category === category)
}

export const getAllCategories = (): ServiceCategory[] => {
  const categories = new Set(SERVICE_BRANDS.map(brand => brand.category))
  return Array.from(categories)
}

export const getCategoryLabel = (category: ServiceCategory): string => {
  const labels: Record<ServiceCategory, string> = {
    authentication: 'Authentication & OAuth',
    cloud: 'Cloud Services',
    payment: 'Payments & Billing',
    email: 'Email Services',
    storage: 'Storage & CDN',
    communication: 'Communication',
    development: 'Development Tools',
    analytics: 'Analytics & Tracking',
  }
  return labels[category] || category
}

export const getCategoryIcon = (category: ServiceCategory): string => {
  const icons: Record<ServiceCategory, string> = {
    authentication: '🔐',
    cloud: '☁️',
    payment: '💳',
    email: '📧',
    storage: '🗄️',
    communication: '💬',
    development: '👨‍💻',
    analytics: '📊',
  }
  return icons[category] || '📦'
}
