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
  const lightColors = Object.entries(theme.light ?? {})
    .map(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      return `${cssVar}: ${value};`
    })
    .join('\n    ')

  const darkColors = Object.entries(theme.dark ?? {})
    .map(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      return `${cssVar}: ${value};`
    })
    .join('\n    ')

  // theme.typography/theme.spacing being present doesn't guarantee their
  // nested keys are (2026-07-08 incident: a stored theme_config had
  // typography.fontFamilyHeading but no fontSize/fontWeight/lineHeight at
  // all — this function's own Object.entries() on the missing nested key
  // took the whole site down; the top-level `? :` guards below never
  // caught it). getThemeConfig() now deep-merges before this ever runs, but
  // guarding the nested keys here too means a caller that skips that merge
  // degrades instead of crashing.
  const typography = theme.typography
    ? `
    --font-family: ${theme.typography.fontFamily};
    --font-family-heading: ${theme.typography.fontFamilyHeading};
    --font-family-mono: ${theme.typography.fontFamilyMono};
    ${Object.entries(theme.typography.fontSize ?? {})
      .map(([key, value]) => `--font-size-${key}: ${value};`)
      .join('\n    ')}
    ${Object.entries(theme.typography.fontWeight ?? {})
      .map(([key, value]) => `--font-weight-${key}: ${value};`)
      .join('\n    ')}
    ${Object.entries(theme.typography.lineHeight ?? {})
      .map(([key, value]) => `--line-height-${key}: ${value};`)
      .join('\n    ')}
  `
    : ''

  const spacing = theme.spacing
    ? `
    ${Object.entries(theme.spacing.borderRadius ?? {})
      .map(([key, value]) => `--radius-${key}: ${value};`)
      .join('\n    ')}
    ${Object.entries(theme.spacing.spacing ?? {})
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
