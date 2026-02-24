import { db } from "@/db"
import { platformConfig } from "@/db/schema"

export interface PlatformConfigData {
  siteName: string
  logo: string | null
  logoDisplayMode?: "logo" | "text" | "both"
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
  cookiePosition?: "bottom-left" | "bottom-right"
  hostingProviderName?: string
  hostingProviderAddress?: string
  hostingProviderContact?: string
  adminFooterCopyright?: string
}

// Re-export for convenience
export type { PlatformConfigData as PlatformConfig }

export async function getPlatformConfig(): Promise<PlatformConfigData> {
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
      gtmCode: configMap['gtm_code'] || null,
      customHeaderCode: configMap['custom_header_code'] || null,
      customFooterCode: configMap['custom_footer_code'] || null,
      seoSettings: configMap['seo_settings'] || null,
      socialLinks: configMap['social_links'] || null,
      tosPosition: configMap['tos_position'] || 'center',
      showCookieLogo: configMap['show_cookie_logo'] === 'true' || configMap['show_cookie_logo'] === true,
      cookieConsentEnabled: configMap['cookie_consent_enabled'] !== 'false' && configMap['cookie_consent_enabled'] !== false, // Default to true
      cookieConsentMessage: configMap['cookie_consent_message'] || "Nous utilisons des cookies pour améliorer votre expérience sur notre site. En continuant à naviguer, vous acceptez notre utilisation des cookies.",
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
