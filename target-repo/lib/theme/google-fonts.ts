/**
 * Google Fonts integration (Pilier D — Typography module v2).
 *
 * Loaded via the Google Fonts CSS2 link API (fonts.googleapis.com/css2), not
 * next/font/google — next/font requires a static import per font known at
 * build time, which can't work for an admin-driven runtime choice across the
 * full Google Fonts catalog. The curated list below is a starting point for
 * the picker UI (searchable); any Google Font family name can also be typed
 * in free-text (GOOGLE_FONTS is not an allowlist), which is how the full
 * ~1800-family catalog stays reachable without hand-maintaining all of it.
 */

export interface GoogleFontEntry {
  family: string
  category: "sans-serif" | "serif" | "display" | "handwriting" | "monospace"
}

export const GOOGLE_FONTS: GoogleFontEntry[] = [
  // Sans-serif
  { family: "Inter", category: "sans-serif" },
  { family: "Roboto", category: "sans-serif" },
  { family: "Open Sans", category: "sans-serif" },
  { family: "Lato", category: "sans-serif" },
  { family: "Montserrat", category: "sans-serif" },
  { family: "Poppins", category: "sans-serif" },
  { family: "Source Sans 3", category: "sans-serif" },
  { family: "Nunito", category: "sans-serif" },
  { family: "Nunito Sans", category: "sans-serif" },
  { family: "Work Sans", category: "sans-serif" },
  { family: "Rubik", category: "sans-serif" },
  { family: "Mulish", category: "sans-serif" },
  { family: "DM Sans", category: "sans-serif" },
  { family: "Manrope", category: "sans-serif" },
  { family: "Karla", category: "sans-serif" },
  { family: "Barlow", category: "sans-serif" },
  { family: "Inconsolata", category: "sans-serif" },
  { family: "Raleway", category: "sans-serif" },
  { family: "PT Sans", category: "sans-serif" },
  { family: "Noto Sans", category: "sans-serif" },
  { family: "Ubuntu", category: "sans-serif" },
  { family: "Fira Sans", category: "sans-serif" },
  { family: "Hind", category: "sans-serif" },
  { family: "Cabin", category: "sans-serif" },
  { family: "Quicksand", category: "sans-serif" },
  { family: "Josefin Sans", category: "sans-serif" },
  { family: "Heebo", category: "sans-serif" },
  { family: "Archivo", category: "sans-serif" },
  { family: "Space Grotesk", category: "sans-serif" },
  { family: "Figtree", category: "sans-serif" },
  { family: "Plus Jakarta Sans", category: "sans-serif" },
  { family: "Outfit", category: "sans-serif" },
  { family: "Sora", category: "sans-serif" },
  { family: "Lexend", category: "sans-serif" },
  { family: "Urbanist", category: "sans-serif" },

  // Serif
  { family: "Playfair Display", category: "serif" },
  { family: "Merriweather", category: "serif" },
  { family: "Lora", category: "serif" },
  { family: "PT Serif", category: "serif" },
  { family: "Source Serif 4", category: "serif" },
  { family: "Noto Serif", category: "serif" },
  { family: "Crimson Text", category: "serif" },
  { family: "Libre Baskerville", category: "serif" },
  { family: "EB Garamond", category: "serif" },
  { family: "Cormorant Garamond", category: "serif" },
  { family: "Bitter", category: "serif" },
  { family: "Spectral", category: "serif" },
  { family: "Domine", category: "serif" },
  { family: "Vollkorn", category: "serif" },
  { family: "Cardo", category: "serif" },

  // Display
  { family: "Bebas Neue", category: "display" },
  { family: "Oswald", category: "display" },
  { family: "Anton", category: "display" },
  { family: "Abril Fatface", category: "display" },
  { family: "Righteous", category: "display" },
  { family: "Fjalla One", category: "display" },
  { family: "Alfa Slab One", category: "display" },
  { family: "Passion One", category: "display" },
  { family: "Staatliches", category: "display" },
  { family: "Bungee", category: "display" },

  // Handwriting
  { family: "Pacifico", category: "handwriting" },
  { family: "Dancing Script", category: "handwriting" },
  { family: "Caveat", category: "handwriting" },
  { family: "Great Vibes", category: "handwriting" },
  { family: "Satisfy", category: "handwriting" },
  { family: "Sacramento", category: "handwriting" },
  { family: "Kalam", category: "handwriting" },
  { family: "Shadows Into Light", category: "handwriting" },

  // Monospace
  { family: "Roboto Mono", category: "monospace" },
  { family: "Source Code Pro", category: "monospace" },
  { family: "JetBrains Mono", category: "monospace" },
  { family: "Fira Code", category: "monospace" },
  { family: "IBM Plex Mono", category: "monospace" },
  { family: "Space Mono", category: "monospace" },
  { family: "Courier Prime", category: "monospace" },
  { family: "Inconsolata", category: "monospace" },
]

/**
 * Builds a Google Fonts CSS2 stylesheet URL for a given family. Works for any
 * valid Google Fonts family name, not just entries in GOOGLE_FONTS above.
 */
export function buildGoogleFontsUrl(family: string, weights: number[] = [400, 500, 600, 700]): string {
  const familyParam = `${family.replace(/ /g, "+")}:wght@${weights.join(";")}`
  return `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`
}
