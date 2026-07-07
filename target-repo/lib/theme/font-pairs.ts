/**
 * Curated font pairs selectable from Admin → Settings → Styles (Pilier D).
 * Selecting a pair sets ThemeConfig.typography.fontFamily/fontFamilyHeading to the
 * corresponding CSS variables (loaded via lib/theme/fonts.ts) — reuses the existing
 * typography plumbing (generateThemeCSS, applyThemeVariables) unchanged.
 */

export interface FontPair {
  id: string
  label: string
  /** Body text font-family CSS value. */
  fontFamily: string
  /** Heading font-family CSS value. */
  fontFamilyHeading: string
}

export const FONT_PAIRS: FontPair[] = [
  {
    id: "system",
    label: "Système (par défaut)",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyHeading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: "inter",
    label: "Inter",
    fontFamily: "var(--font-inter)",
    fontFamilyHeading: "var(--font-inter)",
  },
  {
    id: "poppins-inter",
    label: "Poppins + Inter",
    fontFamily: "var(--font-inter)",
    fontFamilyHeading: "var(--font-poppins)",
  },
  {
    id: "playfair-source",
    label: "Playfair Display + Source Sans",
    fontFamily: "var(--font-source-sans-3)",
    fontFamilyHeading: "var(--font-playfair-display)",
  },
]

export function getFontPair(id: string | undefined): FontPair {
  return FONT_PAIRS.find((pair) => pair.id === id) ?? FONT_PAIRS[0]
}
