"use client"

import React, { createContext, useContext, ReactNode } from 'react'

export interface PlatformConfig {
  siteName: string
  logo: string | null
  logoDisplayMode?: "logo" | "text" | "both"
  authEnabled?: boolean
  maintenanceMode?: boolean
  adminFooterCopyright?: string
}

const defaultConfig: PlatformConfig = {
  siteName: 'NeoSaaS',
  logo: null,
  logoDisplayMode: 'both',
  authEnabled: true,
  maintenanceMode: false,
  adminFooterCopyright: undefined
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
