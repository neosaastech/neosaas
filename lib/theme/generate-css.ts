/**
 * Generate Theme CSS (Server-side utility)
 * Génère le CSS pour les variables du thème
 * Cette fonction est utilisable côté serveur (SSR)
 */

import type { ThemeConfig } from '@/types/theme-config'
import { getFontFaceCSS } from './font-source'

/**
 * Générer le CSS du thème pour le SSR
 */
export function generateThemeCSS(theme: ThemeConfig): string {
  const fontFaces = [
    getFontFaceCSS(theme.headingFontSource, 'heading'),
    getFontFaceCSS(theme.bodyFontSource, 'body'),
  ]
    .filter(Boolean)
    .join('\n  ')
  const lightColors = Object.entries(theme.light)
    .map(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      return `${cssVar}: ${value};`
    })
    .join('\n    ')

  const darkColors = Object.entries(theme.dark)
    .map(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      return `${cssVar}: ${value};`
    })
    .join('\n    ')

  const typography = theme.typography
    ? `
    --font-family: ${theme.typography.fontFamily};
    --font-family-heading: ${theme.typography.fontFamilyHeading};
    --font-family-mono: ${theme.typography.fontFamilyMono};
    ${Object.entries(theme.typography.fontSize)
      .map(([key, value]) => `--font-size-${key}: ${value};`)
      .join('\n    ')}
    ${Object.entries(theme.typography.fontWeight)
      .map(([key, value]) => `--font-weight-${key}: ${value};`)
      .join('\n    ')}
    ${Object.entries(theme.typography.lineHeight)
      .map(([key, value]) => `--line-height-${key}: ${value};`)
      .join('\n    ')}
  `
    : ''

  const spacing = theme.spacing
    ? `
    ${Object.entries(theme.spacing.borderRadius)
      .map(([key, value]) => `--radius-${key}: ${value};`)
      .join('\n    ')}
    ${Object.entries(theme.spacing.spacing)
      .map(([key, value]) => `--spacing-${key}: ${value};`)
      .join('\n    ')}
  `
    : ''

  return `
  ${fontFaces}

  :root {
    ${lightColors}
    ${typography}
    ${spacing}
    ${theme.radiusBase ? `--radius: ${theme.radiusBase};` : ''}
  }

  .dark {
    ${darkColors}
  }
  `
}
