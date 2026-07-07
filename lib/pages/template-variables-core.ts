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
  { key: "siteName", label: "Nom du site", description: "Nom configuré dans Paramètres", example: "NeoSaaS", group: "site" },
  { key: "domain", label: "Domaine", description: "Hostname du site (SEO ou APP_URL)", example: "neosaas.tech", group: "site" },
  { key: "locale", label: "Locale", description: "Langue de la page", example: "fr", group: "site" },
  { key: "contactEmail", label: "Email contact", description: "Email expéditeur par défaut", example: "no-reply@neosaas.tech", group: "site" },
  { key: "year", label: "Année", description: "Année courante", example: "2026", group: "date" },
  { key: "date", label: "Date", description: "Date du jour (locale)", example: "05/07/2026", group: "date" },
  { key: "dateTime", label: "Date et heure", description: "Horodatage du rendu", example: "05/07/2026 14:30", group: "date" },
  { key: "firstName", label: "Prénom", description: "Utilisateur connecté — vide si visiteur", example: "Marie", group: "user" },
  { key: "lastName", label: "Nom", description: "Utilisateur connecté — vide si visiteur", example: "Dupont", group: "user" },
  { key: "userName", label: "Nom complet", description: "Prénom + nom — vide si visiteur", example: "Marie Dupont", group: "user" },
  { key: "userEmail", label: "Email utilisateur", description: "Email de session — vide si visiteur", example: "marie@exemple.com", group: "user" },
  { key: "isLoggedIn", label: "Connecté", description: "true ou false", example: "true", group: "user" },
  { key: "companyName", label: "Entreprise", description: "Société de l'utilisateur — vide si visiteur", example: "Acme SAS", group: "company" },
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
