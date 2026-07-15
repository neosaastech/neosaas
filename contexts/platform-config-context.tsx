"use client"

import React, { createContext, useContext, ReactNode } from 'react'

export interface PlatformSocialLinks {
  twitter?: string
  facebook?: string
  linkedin?: string
  instagram?: string
  github?: string
}

export interface PlatformConfig {
  siteName: string
  logo: string | null
  logoDisplayMode?: "logo" | "text" | "both" | "none"
  authEnabled?: boolean
  maintenanceMode?: boolean
  adminFooterCopyright?: string
  socialLinks?: PlatformSocialLinks | null
  /**
   * Charles (2026-07-15): merge-tag fields ({{contactEmail}},
   * {{hostingProviderName}}...) — already present on the server
   * PlatformConfigData (lib/config.ts) and flowing through to this context
   * at runtime (PublicLayout passes the full object), just not previously
   * declared here so client components couldn't use them by name. Field
   * name matches PlatformConfigData.defaultSenderEmail verbatim — this is
   * a structural (not literal) object passed through, no renaming happens
   * at the boundary. See lib/pages/template-variables-core.ts →
   * buildClientTemplateVariables.
   */
  defaultSenderEmail?: string
  hostingProviderName?: string
  hostingProviderAddress?: string
  hostingProviderContact?: string
}

const defaultConfig: PlatformConfig = {
  siteName: 'NeoSaaS',
  logo: null,
  logoDisplayMode: 'both',
  authEnabled: true,
  maintenanceMode: false,
  adminFooterCopyright: undefined,
  socialLinks: null
}

const PlatformConfigContext = createContext<PlatformConfig>(defaultConfig)

interface PlatformConfigProviderProps {
  children: ReactNode
  config: PlatformConfig
}

export function PlatformConfigProvider({ children, config }: PlatformConfigProviderProps) {
  return (
    <PlatformConfigContext.Provider value={config}>
      {children}
    </PlatformConfigContext.Provider>
  )
}

export function usePlatformConfig(): PlatformConfig {
  return useContext(PlatformConfigContext)
}
