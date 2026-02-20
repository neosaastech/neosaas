/**
 * Dynamic Theme Provider Component
 * Applique les variables CSS dynamiques du thème configuré
 * et synchronise avec next-themes pour le mode clair/sombre
 */

'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import type { ThemeConfig } from '@/types/theme-config'
export { generateThemeCSS } from '@/lib/theme/generate-css'

interface DynamicThemeProviderProps {
  theme: ThemeConfig
  children: React.ReactNode
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
    applyThemeVariables(theme, resolvedTheme)
  }, [theme, resolvedTheme])

  return <>{children}</>
}

/**
 * Applique les variables CSS du thème
 */
function applyThemeVariables(theme: ThemeConfig, resolvedTheme: string | undefined) {
  const root = document.documentElement

  // Déterminer quelle palette utiliser basé sur le thème résolu de next-themes
  const isDark = resolvedTheme === 'dark'
  const colorPalette = isDark ? theme.dark : theme.light

  // Appliquer les couleurs
  Object.entries(colorPalette).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    root.style.setProperty(cssVar, value)
  })

  // Appliquer la typographie
  if (theme.typography) {
    root.style.setProperty('--font-family', theme.typography.fontFamily)
    root.style.setProperty('--font-family-heading', theme.typography.fontFamilyHeading)
    root.style.setProperty('--font-family-mono', theme.typography.fontFamilyMono)

    // Tailles de police
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value)
    })

    // Poids de police
    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value)
    })

    // Hauteur de ligne
    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      root.style.setProperty(`--line-height-${key}`, value)
    })
  }

  // Appliquer l'espacement
  if (theme.spacing) {
    // Border radius
    Object.entries(theme.spacing.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value)
    })

    // Spacing
    Object.entries(theme.spacing.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })
  }
}
