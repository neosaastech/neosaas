import { cache } from "react"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users, companies } from "@/db/schema"
import { getPlatformConfig } from "@/lib/config"
import { getCurrentUser } from "@/lib/auth"
import { isOfflineDev } from "@/lib/dev/offline-mode"
import { OFFLINE_AUTH_ME_USER } from "@/lib/dev/mock-data"
import {
  PAGE_TEMPLATE_VARIABLE_CATALOG,
  interpolateDeep,
  interpolateTemplateString,
  type PageTemplateVariables,
  type PageTemplateVariableDefinition,
} from "@/lib/pages/template-variables-core"

export {
  PAGE_TEMPLATE_VARIABLE_CATALOG,
  interpolateDeep,
  interpolateTemplateString,
  type PageTemplateVariables,
  type PageTemplateVariableDefinition,
}

const LOCALE_TAGS: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
}

function resolveDomain(baseUrl: string): string {
  if (!baseUrl) return ""
  try {
    return new URL(baseUrl).hostname
  } catch {
    return baseUrl.replace(/^https?:\/\//, "").split("/")[0] ?? ""
  }
}

async function loadUserProfile(userId: string) {
  if (isOfflineDev()) {
    return {
      firstName: OFFLINE_AUTH_ME_USER.firstName ?? "Dev",
      lastName: OFFLINE_AUTH_ME_USER.lastName ?? "Admin",
      companyName: "NeoSaaS Dev",
    }
  }

  const [row] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      companyName: companies.name,
    })
    .from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .where(eq(users.id, userId))
    .limit(1)

  return {
    firstName: row?.firstName ?? "",
    lastName: row?.lastName ?? "",
    companyName: row?.companyName ?? "",
  }
}

/** Built once per request — used by BlockRenderer to resolve `{{variables}}` in layer props. */
export const buildPageTemplateContext = cache(async (locale: string): Promise<PageTemplateVariables> => {
  const [config, session] = await Promise.all([getPlatformConfig(), getCurrentUser()])
  const now = new Date()
  const localeTag = LOCALE_TAGS[locale] ?? locale
  const baseUrl = config.seoSettings?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || ""

  let firstName = ""
  let lastName = ""
  let companyName = ""

  if (session?.userId) {
    const profile = await loadUserProfile(session.userId)
    firstName = profile.firstName
    lastName = profile.lastName
    companyName = profile.companyName
  }

  const userName = [firstName, lastName].filter(Boolean).join(" ")
  const siteName = config.siteName
  const socialLinks = (config.socialLinks ?? null) as {
    twitter?: string
    linkedin?: string
    facebook?: string
    instagram?: string
    github?: string
  } | null

  return {
    siteName,
    site_name: siteName,
    domain: resolveDomain(baseUrl),
    locale,
    contactEmail: config.defaultSenderEmail,
    // Charles (2026-07-15): "on a bien des informations pour les réseaux
    // sociaux... et le RGPD" — same fields the client-side builder
    // (buildClientTemplateVariables, template-variables-core.ts) exposes to
    // Header/Footer, kept in sync so a tag behaves the same everywhere.
    socialTwitter: socialLinks?.twitter ?? "",
    socialLinkedin: socialLinks?.linkedin ?? "",
    socialFacebook: socialLinks?.facebook ?? "",
    socialInstagram: socialLinks?.instagram ?? "",
    socialGithub: socialLinks?.github ?? "",
    hostingProviderName: config.hostingProviderName ?? "",
    hostingProviderAddress: config.hostingProviderAddress ?? "",
    hostingProviderContact: config.hostingProviderContact ?? "",
    year: String(now.getFullYear()),
    date: now.toLocaleDateString(localeTag),
    dateTime: now.toLocaleString(localeTag),
    firstName,
    lastName,
    userName,
    userEmail: session?.email ?? "",
    companyName,
    isLoggedIn: session ? "true" : "false",
  }
})
