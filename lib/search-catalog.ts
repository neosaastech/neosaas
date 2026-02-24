/**
 * Centralized search catalog
 * This file defines all elements indexed in the search system
 */

export interface SearchElement {
  name: string
  path: string
  category: string
  keywords: string[]
  section?: string // To identify the section (admin, front, docs, etc.)
  description?: string
  requiresAuth?: boolean
  requiresAdmin?: boolean
}

/**
 * Public website pages (Front-end)
 */
export const frontendPages: SearchElement[] = [
  {
    name: "Home",
    path: "/",
    category: "Public Site",
    section: "front",
    keywords: ["home", "landing", "homepage"],
    description: "Website homepage"
  },
  {
    name: "Store",
    path: "/store",
    category: "Commerce",
    section: "front",
    keywords: ["store", "shop", "buy", "products"],
    description: "Products and services catalog"
  },
  {
    name: "Pricing & Plans",
    path: "/pricing",
    category: "Commercial",
    section: "front",
    keywords: ["pricing", "plans", "subscription", "price"],
    description: "Pricing grid and subscription plans"
  },
  {
    name: "Contact",
    path: "/contact",
    category: "Support",
    section: "front",
    keywords: ["contact", "support", "help"],
    description: "Contact form"
  },
  {
    name: "About",
    path: "/about",
    category: "Information",
    section: "front",
    keywords: ["about", "company"],
    description: "Company presentation"
  },
  {
    name: "Legal Notice",
    path: "/legal/mentions",
    category: "Legal",
    section: "front",
    keywords: ["legal", "notice"],
    description: "Legal notice"
  },
  {
    name: "Privacy Policy",
    path: "/legal/privacy",
    category: "Legal",
    section: "front",
    keywords: ["privacy", "gdpr", "data"],
    description: "Privacy policy"
  },
  {
    name: "Terms of Service",
    path: "/legal/terms",
    category: "Legal",
    section: "front",
    keywords: ["terms", "conditions"],
    description: "General terms of use"
  },
  {
    name: "Login",
    path: "/auth/login",
    category: "Authentication",
    section: "front",
    keywords: ["login", "sign in"],
    description: "Login page"
  },
  {
    name: "Register",
    path: "/auth/register",
    category: "Authentication",
    section: "front",
    keywords: ["register", "sign up"],
    description: "Create a new account"
  },
]

/**
 * User dashboard pages (Authenticated)
 */
export const dashboardPages: SearchElement[] = [
  {
    name: "Main Dashboard",
    path: "/dashboard",
    category: "Navigation",
    section: "dashboard",
    keywords: ["home", "main", "dashboard"],
    description: "Main dashboard",
    requiresAuth: true
  },
  {
    name: "My Profile",
    path: "/dashboard/profile",
    category: "Account",
    section: "dashboard",
    keywords: ["profile", "user", "settings"],
    description: "Manage my profile",
    requiresAuth: true
  },
  {
    name: "Payments & Billing",
    path: "/dashboard/payments",
    category: "Finance",
    section: "dashboard",
    keywords: ["billing", "payments", "invoice"],
    description: "Payment history",
    requiresAuth: true
  },
  {
    name: "Cart",
    path: "/dashboard/cart",
    category: "Commerce",
    section: "dashboard",
    keywords: ["cart", "shopping"],
    description: "My shopping cart",
    requiresAuth: true
  },
  {
    name: "Calendar",
    path: "/dashboard/calendar",
    category: "Planning",
    section: "dashboard",
    keywords: ["calendar", "planning", "agenda"],
    description: "Calendar view",
    requiresAuth: true
  },
]

/**
 * Administration pages (Admin only)
 */
export const adminPages: SearchElement[] = [
  {
    name: "Admin Dashboard",
    path: "/admin",
    category: "Administration",
    section: "admin",
    keywords: ["admin", "administration", "dashboard", "backend"],
    description: "Administrator dashboard",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "User Management",
    path: "/admin/users",
    category: "Administration",
    section: "admin",
    keywords: ["users", "members", "roles", "permissions"],
    description: "Manage users and their roles",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Order Management",
    path: "/admin/orders",
    category: "Commerce",
    section: "admin",
    keywords: ["orders", "sales", "invoices"],
    description: "Manage customer orders",
    requiresAuth: true,
    requiresAdmin: true
  },
]

/**
 * Products management - Main page and types
 */
export const productsPages: SearchElement[] = [
  {
    name: "Products Management",
    path: "/admin/products",
    category: "Commerce",
    section: "admin",
    keywords: ["products", "inventory", "stock", "catalogue"],
    description: "Manage all products",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Standard Products",
    path: "/admin/products?type=standard",
    category: "Commerce",
    section: "admin",
    keywords: ["standard", "physical", "stock"],
    description: "Standard physical products",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Free Products",
    path: "/admin/products?type=free",
    category: "Commerce",
    section: "admin",
    keywords: ["free", "freemium"],
    description: "Free products",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Digital Products",
    path: "/admin/products?type=digital",
    category: "Commerce",
    section: "admin",
    keywords: ["digital", "download"],
    description: "Downloadable products",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "VAT Rates",
    path: "/admin/vat-rates",
    category: "Commerce",
    section: "admin",
    keywords: ["vat", "tax", "taxes"],
    description: "Manage VAT rates",
    requiresAuth: true,
    requiresAdmin: true
  },
]

/**
 * Settings - Tabs and sections
 */
export const settingsPages: SearchElement[] = [
  {
    name: "General Settings",
    path: "/admin/settings",
    category: "Configuration",
    section: "admin",
    keywords: ["settings", "general", "configuration", "site", "logo", "maintenance"],
    description: "General site configuration",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "System Logs",
    path: "/admin/settings#logs",
    category: "Monitoring",
    section: "admin",
    keywords: ["logs", "events", "monitoring", "debug", "errors"],
    description: "View system logs",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Pages & ACL",
    path: "/admin/settings#pages",
    category: "Sécurité",
    section: "admin",
    keywords: ["pages", "acl", "access", "permissions", "roles", "security"],
    description: "Manage page permissions",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Site Configuration",
    path: "/admin/settings#general",
    category: "Configuration",
    section: "admin",
    keywords: ["site name", "url", "email", "contact", "gdpr"],
    description: "Name, URL and contacts",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Logo & Branding",
    path: "/admin/settings#general",
    category: "Configuration",
    section: "admin",
    keywords: ["logo", "branding", "image", "visual"],
    description: "Manage logo and visual identity",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "SEO & Metadata",
    path: "/admin/settings#general",
    category: "Marketing",
    section: "admin",
    keywords: ["seo", "meta", "og", "open graph", "description"],
    description: "Search engine optimization",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Google Tag Manager",
    path: "/admin/settings#general",
    category: "Analytics",
    section: "admin",
    keywords: ["gtm", "google", "analytics", "tracking", "tag manager"],
    description: "Configuration GTM",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Custom Code",
    path: "/admin/settings#general",
    category: "Development",
    section: "admin",
    keywords: ["custom code", "header", "footer", "script", "html", "javascript", "code"],
    description: "Inject custom code",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "HTTP Headers",
    path: "/admin/settings#general",
    category: "Security",
    section: "admin",
    keywords: ["http headers", "security", "cors", "csp", "https"],
    description: "Configure security headers",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Social Networks",
    path: "/admin/settings#general",
    category: "Marketing",
    section: "admin",
    keywords: ["social", "twitter", "facebook", "linkedin", "instagram", "github"],
    description: "Social media links",
    requiresAuth: true,
    requiresAdmin: true
  },
]

/**
 * Other admin configurations
 */
export const configPages: SearchElement[] = [
  {
    name: "Email Configuration",
    path: "/admin/mail",
    category: "Communication",
    section: "admin",
    keywords: ["mail", "email", "smtp", "transactional", "resend", "templates", "emails"],
    description: "Configure email sending",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "API Management",
    path: "/admin/api",
    category: "Development",
    section: "admin",
    keywords: ["api", "keys", "integration", "webhook", "rest"],
    description: "Manage API keys",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    name: "Legal Pages Admin",
    path: "/admin/legal",
    category: "Legal",
    section: "admin",
    keywords: ["legal", "privacy", "terms", "gdpr"],
    description: "Edit legal pages",
    requiresAuth: true,
    requiresAdmin: true
  },
]

/**
 * Documentation (accessible according to configuration)
 */
export const documentationPages: SearchElement[] = [
  {
    name: "Documentation",
    path: "/docs",
    category: "Documentation",
    section: "docs",
    keywords: ["docs", "documentation", "help", "guide"],
    description: "Documentation du projet"
  },
  {
    name: "Quick Start Guide",
    path: "/docs/quick-start",
    category: "Documentation",
    section: "docs",
    keywords: ["quick start", "getting started", "installation", "setup"],
    description: "Quick start guide"
  },
  {
    name: "Troubleshooting",
    path: "/docs/troubleshooting",
    category: "Documentation",
    section: "docs",
    keywords: ["troubleshooting", "errors", "help"],
    description: "Troubleshooting guide"
  },
  {
    name: "Search System",
    path: "/docs/admin-search",
    category: "Documentation",
    section: "docs",
    keywords: ["search", "navigation", "find"],
    description: "Search system documentation"
  },
  {
    name: "Project Architecture",
    path: "/docs/architecture",
    category: "Documentation",
    section: "docs",
    keywords: ["architecture", "structure", "tech stack"],
    description: "Technical architecture"
  },
]

/**
 * Complete catalog - Combines all elements
 */
export function getFullSearchCatalog(): SearchElement[] {
  return [
    ...frontendPages,
    ...dashboardPages,
    ...adminPages,
    ...productsPages,
    ...settingsPages,
    ...configPages,
    ...documentationPages,
  ]
}

/**
 * Filter catalog according to user permissions
 */
export function getFilteredCatalog(userRoles?: string[]): SearchElement[] {
  const catalog = getFullSearchCatalog()
  const isAdmin = userRoles?.some(role => 
    role.toLowerCase() === 'admin' || role.toLowerCase() === 'super_admin'
  )

  return catalog.filter(item => {
    // If the element requires admin and user is not admin
    if (item.requiresAdmin && !isAdmin) {
      return false
    }
    // Otherwise, include the element
    return true
  })
}

/**
 * Search in the catalog
 */
export function searchCatalog(
  query: string, 
  catalog: SearchElement[]
): Array<SearchElement & { score: number }> {
  const queryLower = query.toLowerCase()

  const results = catalog
    .map((element) => {
      let score = 0

      // Score for exact name match
      if (element.name.toLowerCase() === queryLower) {
        score += 100
      }

      // Score for name starts with match
      if (element.name.toLowerCase().startsWith(queryLower)) {
        score += 50
      }

      // Score for name contains match
      if (element.name.toLowerCase().includes(queryLower)) {
        score += 30
      }

      // Score for path match
      if (element.path.toLowerCase().includes(queryLower)) {
        score += 20
      }

      // Score for keywords match
      if (element.keywords.some(keyword => keyword.includes(queryLower))) {
        score += 15
      }

      // Score for category match
      if (element.category.toLowerCase().includes(queryLower)) {
        score += 10
      }

      // Score for description match
      if (element.description?.toLowerCase().includes(queryLower)) {
        score += 5
      }

      return { ...element, score }
    })
    .filter((element) => element.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Limit to 8 results max

  return results
}
