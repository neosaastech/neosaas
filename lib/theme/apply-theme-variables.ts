/**
 * Client-side theme application — CSS variables + font assets.
 * Shared by DynamicThemeProvider and admin ThemeSettings live preview.
 */

import type { ThemeConfig } from '@/types/theme-config'
import { getFontFaceCSS, getGoogleFontsLinkHref } from '@/lib/theme/font-source'

const FONT_STYLE_ID = 'neosaas-theme-font-faces'
const GOOGLE_FONTS_LINK_ID = 'neosaas-theme-google-fonts'

export function applyThemeVariables(theme: ThemeConfig, resolvedTheme: string | undefined) {
  const root = document.documentElement
  const isDark = resolvedTheme === 'dark'
  const colorPalette = isDark ? theme.dark : theme.light

  Object.entries(colorPalette).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    root.style.setProperty(cssVar, value)
  })

  if (theme.typography) {
    root.style.setProperty('--font-family', theme.typography.fontFamily)
    root.style.setProperty('--font-family-heading', theme.typography.fontFamilyHeading)
    root.style.setProperty('--font-family-mono', theme.typography.fontFamilyMono)

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value)
    })

    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value)
    })

    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      root.style.setProperty(`--line-height-${key}`, value)
    })
  }

  if (theme.spacing) {
    Object.entries(theme.spacing.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value)
    })

    Object.entries(theme.spacing.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })
  }

  if (theme.radiusBase) {
    root.style.setProperty('--radius', theme.radiusBase)
  }
}

export function applyThemeFontAssets(theme: ThemeConfig) {
  const fontFaces = [
    getFontFaceCSS(theme.headingFontSource, 'heading'),
    getFontFaceCSS(theme.bodyFontSource, 'body'),
  ]
    .filter(Boolean)
    .join('\n')

  let styleEl = document.getElementById(FONT_STYLE_ID) as HTMLStyleElement | null
  if (fontFaces) {
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = FONT_STYLE_ID
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = fontFaces
  } else if (styleEl) {
    styleEl.remove()
  }

  const href = getGoogleFontsLinkHref(theme.headingFontSource, theme.bodyFontSource)
  let linkEl = document.getElementById(GOOGLE_FONTS_LINK_ID) as HTMLLinkElement | null
  if (href) {
    if (!linkEl) {
      linkEl = document.createElement('link')
      linkEl.id = GOOGLE_FONTS_LINK_ID
      linkEl.rel = 'stylesheet'
      document.head.appendChild(linkEl)
    }
    if (linkEl.getAttribute('href') !== href) {
      linkEl.setAttribute('href', href)
    }
  } else if (linkEl) {
    linkEl.remove()
  }
}

export function applyThemePreview(theme: ThemeConfig, resolvedTheme: string | undefined) {
  applyThemeVariables(theme, resolvedTheme)
  applyThemeFontAssets(theme)
}
