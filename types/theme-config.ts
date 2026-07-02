/**
 * Theme Configuration Types
 * Système de personnalisation des couleurs et styles du site
 */

/**
 * Where a heading/body font comes from (module Typographie complet, Pilier D).
 * - 'system'  : value ignored, system font stack
 * - 'google'  : value = famille Google Fonts (n'importe laquelle, pas juste GOOGLE_FONTS)
 * - 'upload'  : value = data URI base64 du fichier de police uploadé
 * - 'link'    : value = URL directe d'un fichier de police (.woff2/.woff/.ttf)
 */
export interface FontSource {
  type: 'system' | 'google' | 'upload' | 'link'
  value: string
  label?: string
}

export interface ColorPalette {
  // Couleurs principales
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string
  
  // Couleurs d'arrière-plan
  background: string
  foreground: string
  
  // Couleurs de carte/surface
  card: string
  cardForeground: string
  
  // Couleurs de bordure
  border: string
  input: string
  ring: string
  
  // États
  muted: string
  mutedForeground: string
  destructive: string
  destructiveForeground: string
  
  // Couleurs spécifiques
  success: string
  warning: string
  info: string
}

export interface TypographyConfig {
  // Familles de polices
  fontFamily: string
  fontFamilyHeading: string
  fontFamilyMono: string
  
  // Tailles de base
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
  }
  
  // Poids des polices
  fontWeight: {
    light: string
    normal: string
    medium: string
    semibold: string
    bold: string
  }
  
  // Hauteur de ligne
  lineHeight: {
    tight: string
    normal: string
    relaxed: string
  }
}

export interface SpacingConfig {
  // Bordures
  borderRadius: {
    none: string
    sm: string
    md: string
    lg: string
    xl: string
    full: string
  }
  
  // Espacement
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
}

export interface ThemeConfig {
  // Nom du thème
  name: string
  
  // Mode
  mode: 'light' | 'dark' | 'auto'

  // Si false, le bouton de bascule clair/sombre (components/common/theme-toggle.tsx)
  // n'est plus rendu sur le site public — tous les visiteurs restent figés sur `mode`.
  // Si true (défaut), les visiteurs peuvent changer de mode librement.
  allowModeToggle?: boolean
  
  // Palettes de couleurs
  light: ColorPalette
  dark: ColorPalette
  
  // Typographie
  typography: TypographyConfig
  
  // Espacement et bordures
  spacing: SpacingConfig

  // Bibliothèque d'icônes active (Pilier D) — voir components/ui/icon.tsx
  iconLibrary?: 'lucide' | 'tabler' | 'heroicons'

  // Style d'avatar généré (Pilier D — module Iconographie) — voir lib/theme/avatar.ts
  avatarStyle?: string

  // Paire de polices "quick preset" sélectionnée (raccourci UI) — clé dans FONT_PAIRS
  // (lib/theme/font-pairs.ts). 'custom' si heading/bodyFontSource ont été édités à la main.
  fontPairId?: string

  // Source de police pour les titres / le corps de texte (Pilier D — module Typographie
  // complet) — voir lib/theme/font-source.ts. Pilote typography.fontFamily/fontFamilyHeading
  // (calculés depuis ces sources), qui restent le canal appliqué en CSS sans changement.
  headingFontSource?: FontSource
  bodyFontSource?: FontSource

  // Métadonnées
  createdAt?: Date
  updatedAt?: Date
}

// Thème par défaut - Aligned with globals.css (NeoSaaS bronze theme)
export const defaultTheme: ThemeConfig = {
  name: 'Default',
  mode: 'light',
  allowModeToggle: true,
  iconLibrary: 'lucide',
  avatarStyle: 'avataaars',
  fontPairId: 'system',

  light: {
    // Primary - Bronze/copper color (NeoSaaS brand)
    primary: '25 60% 50%',
    primaryForeground: '0 0% 98%',
    // Secondary - Light gray
    secondary: '0 0% 96.1%',
    secondaryForeground: '0 0% 9%',
    // Accent - Light gray
    accent: '0 0% 96.1%',
    accentForeground: '0 0% 9%',
    // Background
    background: '0 0% 100%',
    foreground: '0 0% 3.9%',
    // Card
    card: '0 0% 100%',
    cardForeground: '0 0% 3.9%',
    // Border/Input
    border: '0 0% 89.8%',
    input: '0 0% 89.8%',
    ring: '25 60% 50%',
    // Muted
    muted: '0 0% 96.1%',
    mutedForeground: '0 0% 45.1%',
    // Destructive
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '0 0% 98%',
    // Status colors
    success: '142.1 76.2% 36.3%',
    warning: '38 92% 50%',
    info: '221.2 83.2% 53.3%',
  },

  dark: {
    // Primary - Bronze/copper color (same in dark mode)
    primary: '25 60% 50%',
    primaryForeground: '0 0% 98%',
    // Secondary - Dark gray
    secondary: '0 0% 14.9%',
    secondaryForeground: '0 0% 98%',
    // Accent - Dark gray
    accent: '0 0% 14.9%',
    accentForeground: '0 0% 98%',
    // Background - Dark
    background: '0 0% 10%',
    foreground: '0 0% 98%',
    // Card - Dark
    card: '0 0% 13%',
    cardForeground: '0 0% 98%',
    // Border/Input
    border: '0 0% 14.9%',
    input: '0 0% 14.9%',
    ring: '25 60% 50%',
    // Muted
    muted: '0 0% 14.9%',
    mutedForeground: '0 0% 63.9%',
    // Destructive
    destructive: '0 62.8% 30.6%',
    destructiveForeground: '0 0% 98%',
    // Status colors
    success: '142.1 70.6% 45.3%',
    warning: '38 92% 50%',
    info: '217.2 91.2% 59.8%',
  },
  
  typography: {
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
    fontFamilyHeading: 'var(--font-geist-sans), system-ui, sans-serif',
    fontFamilyMono: 'var(--font-mono)',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  
  spacing: {
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },
  },
}
