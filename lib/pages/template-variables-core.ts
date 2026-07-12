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
