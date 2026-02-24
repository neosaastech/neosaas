/**
 * Theme System - Main Export
 * Point d'entrée principal pour le système de personnalisation de thème
 */

// Types
export type {
  ColorPalette,
  TypographyConfig,
  SpacingConfig,
  ThemeConfig,
} from '@/types/theme-config'

export { defaultTheme } from '@/types/theme-config'

// Actions serveur
export {
  getThemeConfig,
  updateThemeConfig,
  resetThemeConfig,
  updateThemeColors,
  updateTypography,
} from '@/app/actions/theme-config'

// Composants
export { DynamicThemeProvider } from '@/components/common/dynamic-theme-provider'
export { ThemeSettings } from '@/components/admin/theme-settings'
export { ThemeExampleComponent } from '@/components/common/theme-example'

// Utilitaires
export { generateThemeCSS } from '@/lib/theme/generate-css'

/**
 * Utilisation :
 * 
 * // Récupérer le thème
 * import { getThemeConfig } from '@/lib/theme'
 * const theme = await getThemeConfig()
 * 
 * // Mettre à jour
 * import { updateThemeConfig } from '@/lib/theme'
 * await updateThemeConfig(newTheme)
 * 
 * // Réinitialiser
 * import { resetThemeConfig } from '@/lib/theme'
 * await resetThemeConfig()
 */
