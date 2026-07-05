/**
 * Dynamic Theme Provider Component
 * Applique les variables CSS dynamiques du thème configuré
 * et synchronise avec next-themes pour le mode clair/sombre
 */

'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import type { ThemeConfig } from '@/types/theme-config'
import { applyThemePreview } from '@/lib/theme/apply-theme-variables'
export { generateThemeCSS } from '@/lib/theme/generate-css'

interface DynamicThemeProviderProps {
  theme: ThemeConfig
  children: React.ReactNode
}

const ThemeConfigContext = createContext<ThemeConfig | null>(null)

/** Read the current ThemeConfig (colors/typography/mode settings) in a client component. */
export function useThemeConfig(): ThemeConfig | null {
  return useContext(ThemeConfigContext)
}

export function DynamicThemeProvider({ theme, children }: DynamicThemeProviderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const hasInitialized = useRef(false)

  // Synchroniser le mode du thème avec next-themes UNIQUEMENT au premier montage
  // Cela permet à l'utilisateur de changer le thème manuellement via le toggle
  useEffect(() => {
    // Ne s'exécute qu'une seule fois au premier montage
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Vérifier si l'utilisateur a déjà une préférence stockée
    const storedTheme = localStorage.getItem('theme')
    if (storedTheme) {
      // L'utilisateur a déjà choisi un thème, ne pas écraser
      return
    }

    // Appliquer le thème par défaut configuré seulement si pas de préférence utilisateur
    if (theme.mode === 'auto') {
      setTheme('system')
    } else if (theme.mode === 'dark') {
      setTheme('dark')
    } else if (theme.mode === 'light') {
      setTheme('light')
    }
  }, [theme.mode, setTheme])

  // Appliquer les variables CSS quand le thème résolu change
  useEffect(() => {
    applyThemePreview(theme, resolvedTheme)
  }, [theme, resolvedTheme])

  return <ThemeConfigContext.Provider value={theme}>{children}</ThemeConfigContext.Provider>
}
