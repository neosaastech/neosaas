export type PageTemplateVariables = Record<string, string>

export interface PageTemplateVariableDefinition {
  key: string
  label: string
  description: string
  example: string
  group: "site" | "date" | "user" | "company"
}

/** Catalog shown in /admin/pages and Puck — syntax: `{{key}}` */
export const PAGE_TEMPLATE_VARIABLE_CATALOG: PageTemplateVariableDefinition[] = [
  { key: "siteName", label: "Site name", description: "Name configured in Settings", example: "NeoSaaS", group: "site" },
  { key: "domain", label: "Domain", description: "Site hostname (SEO or APP_URL)", example: "neosaas.tech", group: "site" },
  { key: "locale", label: "Locale", description: "Page language", example: "fr", group: "site" },
  { key: "contactEmail", label: "Contact email", description: "Default sender email", example: "no-reply@neosaas.tech", group: "site" },
  // Charles (2026-07-15): "on a bien des informations pour les réseaux
  // sociaux, le nom du site, le mail... et le RGPD" — same catalog used by
  // Pages (server) now also drives Header/Footer (client, see
  // buildClientTemplateVariables below), so these are usable everywhere,
  // not hand-rolled per field like the {{year}}-only copyright was.
  { key: "socialTwitter", label: "Twitter/X URL", description: "Settings → Social links", example: "https://x.com/neosaas", group: "site" },
  { key: "socialLinkedin", label: "LinkedIn URL", description: "Settings → Social links", example: "https://linkedin.com/company/neosaas", group: "site" },
  { key: "socialFacebook", label: "Facebook URL", description: "Settings → Social links", example: "https://facebook.com/neosaas", group: "site" },
  { key: "socialInstagram", label: "Instagram URL", description: "Settings → Social links", example: "https://instagram.com/neosaas", group: "site" },
  { key: "socialGithub", label: "GitHub URL", description: "Settings → Social links", example: "https://github.com/neosaas", group: "site" },
  { key: "hostingProviderName", label: "Hosting provider", description: "Settings → Legal (mentions légales / RGPD)", example: "Scaleway", group: "site" },
  { key: "hostingProviderAddress", label: "Hosting provider address", description: "Settings → Legal (mentions légales / RGPD)", example: "8 rue de la Ville l'Évêque, 75008 Paris", group: "site" },
  { key: "hostingProviderContact", label: "Hosting provider contact", description: "Settings → Legal (mentions légales / RGPD)", example: "contact@scaleway.com", group: "site" },
  { key: "year", label: "Year", description: "Current year", example: "2026", group: "date" },
  { key: "date", label: "Date", description: "Today's date (localized)", example: "05/07/2026", group: "date" },
  { key: "dateTime", label: "Date and time", description: "Render timestamp", example: "05/07/2026 14:30", group: "date" },
  { key: "firstName", label: "First name", description: "Signed-in user — empty for a visitor", example: "Marie", group: "user" },
  { key: "lastName", label: "Last name", description: "Signed-in user — empty for a visitor", example: "Dupont", group: "user" },
  { key: "userName", label: "Full name", description: "First + last name — empty for a visitor", example: "Marie Dupont", group: "user" },
  { key: "userEmail", label: "User email", description: "Session email — empty for a visitor", example: "marie@example.com", group: "user" },
  { key: "isLoggedIn", label: "Logged in", description: "true or false", example: "true", group: "user" },
  { key: "companyName", label: "Company", description: "User's company — empty for a visitor", example: "Acme SAS", group: "company" },
]

/** Replaces `{{key}}` and legacy `{site_name}` in a string. Unknown keys → empty string. */
export function interpolateTemplateString(value: string, variables: PageTemplateVariables): string {
  return value
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => variables[key] ?? "")
    .replace(/\{site_name\}/g, variables.site_name ?? variables.siteName ?? "")
}

/** Deep-walk layer props (strings, arrays, plain objects) before Zod parse. */
export function interpolateDeep<T>(value: T, variables: PageTemplateVariables): T {
  if (typeof value === "string") {
    return interpolateTemplateString(value, variables) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateDeep(item, variables)) as T
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      result[key] = interpolateDeep(nested, variables)
    }
    return result as T
  }

  return value
}

const CLIENT_LOCALE_TAGS: Record<string, string> = { fr: "fr-FR", en: "en-US" }

/**
 * Client-safe counterpart to buildPageTemplateContext (lib/pages/template-
 * variables.ts, server-only — pulls from `db`/session, crashes if imported
 * in a "use client" component). Header/Footer render client-side (see
 * site-footer.tsx), so they need the site/date tags built from whatever
 * PlatformConfig already carries down via React context, with no request/
 * session access — user-scoped tags (firstName, userEmail, etc.) are
 * therefore always empty here, same "signed-out visitor" convention
 * documented in TemplateVariablesHint.
 */
export function buildClientTemplateVariables(config: {
  siteName?: string
  contactEmail?: string
  locale?: string
  socialLinks?: {
    twitter?: string
    linkedin?: string
    facebook?: string
    instagram?: string
    github?: string
  } | null
  hostingProviderName?: string
  hostingProviderAddress?: string
  hostingProviderContact?: string
}): PageTemplateVariables {
  const now = new Date()
  const locale = config.locale ?? "fr"
  const localeTag = CLIENT_LOCALE_TAGS[locale] ?? locale
  const siteName = config.siteName ?? ""

  return {
    siteName,
    site_name: siteName,
    locale,
    contactEmail: config.contactEmail ?? "",
    socialTwitter: config.socialLinks?.twitter ?? "",
    socialLinkedin: config.socialLinks?.linkedin ?? "",
    socialFacebook: config.socialLinks?.facebook ?? "",
    socialInstagram: config.socialLinks?.instagram ?? "",
    socialGithub: config.socialLinks?.github ?? "",
    hostingProviderName: config.hostingProviderName ?? "",
    hostingProviderAddress: config.hostingProviderAddress ?? "",
    hostingProviderContact: config.hostingProviderContact ?? "",
    year: String(now.getFullYear()),
    date: now.toLocaleDateString(localeTag),
    dateTime: now.toLocaleString(localeTag),
    firstName: "",
    lastName: "",
    userName: "",
    userEmail: "",
    companyName: "",
    isLoggedIn: "false",
  }
}
