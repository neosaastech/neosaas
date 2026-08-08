import { db } from "@/db"
import { platformConfig } from "@/db/schema"
import { isOfflineDev } from "@/lib/dev/offline-mode"
import { OFFLINE_PLATFORM_CONFIG } from "@/lib/dev/mock-data"

export interface PlatformConfigData {
  siteName: string
  logo: string | null
  logoDisplayMode?: "logo" | "text" | "both" | "none"
  authEnabled: boolean
  maintenanceMode: boolean
  defaultSenderEmail: string
  gtmCode?: string
  customHeaderCode?: string
  customFooterCode?: string
  seoSettings?: any
  socialLinks?: any
  tosPosition?: "center" | "bottom-left" | "bottom-right"
  showCookieLogo?: boolean
  cookieConsentEnabled?: boolean
  cookieConsentMessage?: string
  // Optional English variant of the custom message above — a custom
  // message is admin-authored free text, not something the dictionary
  // fallback can translate on its own (Charles, 2026-07-15).
  cookieConsentMessageEn?: string
  cookiePosition?: "bottom-left" | "bottom-right"
  hostingProviderName?: string
  hostingProviderAddress?: string
  hostingProviderContact?: string
  adminFooterCopyright?: string
}

// Re-export for convenience
export type { PlatformConfigData as PlatformConfig }

export async function getPlatformConfig(): Promise<PlatformConfigData> {
  if (isOfflineDev()) {
    return OFFLINE_PLATFORM_CONFIG
  }

  try {
    const configs = await db.select().from(platformConfig)

    const configMap: Record<string, any> = {}
    configs.forEach(c => {
      try {
        configMap[c.key] = JSON.parse(c.value || 'null')
      } catch {
        configMap[c.key] = c.value
      }
    })

    return {
      siteName: configMap['site_name'] || 'NeoSaaS',
      logo: configMap['logo'] || null,
      logoDisplayMode: configMap['logo_display_mode'] || 'both',
      authEnabled: configMap['auth_enabled'] === 'true',
      maintenanceMode: configMap['maintenance_mode'] === 'true' || configMap['maintenance_mode'] === true,
      defaultSenderEmail: configMap['default_sender_email'] || 'no-reply@neosaas.tech',
      // Trimmed defensively: a stray leading/trailing space (e.g. pasted from
      // clipboard) makes gtm.js?id=<value> resolve to a container ID that
      // doesn't exist, so the container silently never loads — no error, no
      // tracking data, confirmed live (id was stored as " GTM-KVRW5VPV").
      gtmCode: typeof configMap['gtm_code'] === 'string' ? configMap['gtm_code'].trim() || null : null,
      customHeaderCode: configMap['custom_header_code'] || null,
      customFooterCode: configMap['custom_footer_code'] || null,
      seoSettings: configMap['seo_settings'] || null,
      socialLinks: configMap['social_links'] || null,
      tosPosition: configMap['tos_position'] || 'center',
      showCookieLogo: configMap['show_cookie_logo'] === 'true' || configMap['show_cookie_logo'] === true,
      cookieConsentEnabled: configMap['cookie_consent_enabled'] !== 'false' && configMap['cookie_consent_enabled'] !== false, // Default to true
      // No hardcoded (French) default here anymore — an empty value lets
      // CookieConsent fall back to its own locale-aware default message
      // (lib/i18n/legal-dictionary.ts) instead of always showing French
      // text on /en too (found 2026-07-15: this default was non-empty, so
      // the component's own English fallback was dead code in practice).
      cookieConsentMessage: configMap['cookie_consent_message'] || undefined,
      cookieConsentMessageEn: configMap['cookie_consent_message_en'] || undefined,
      cookiePosition: configMap['cookie_position'] || 'bottom-left',
      hostingProviderName: configMap['hosting_provider_name'] || null,
      hostingProviderAddress: configMap['hosting_provider_address'] || null,
      hostingProviderContact: configMap['hosting_provider_contact'] || null,
      adminFooterCopyright: configMap['admin_footer_copyright'] || null
    }
  } catch (error) {
    console.error("Failed to fetch platform config:", error)
    return {
      siteName: 'NeoSaaS',
      logo: null,
      authEnabled: true,
      maintenanceMode: false,
      defaultSenderEmail: 'no-reply@neosaas.tech',
      gtmCode: null,
      customHeaderCode: null,
      customFooterCode: null,
      seoSettings: null,
      socialLinks: null,
      tosPosition: 'center'
    }
  }
}
