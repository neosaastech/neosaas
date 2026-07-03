/**
 * Curated Google Fonts loaded at build time (Pilier D). `next/font/google` requires
 * static imports, so the set of selectable fonts is fixed here rather than resolved
 * dynamically from the admin's stored choice — the admin picks among these pairs,
 * it doesn't add arbitrary new fonts.
 */
import { Inter, Poppins, Playfair_Display, Source_Sans_3 } from "next/font/google"

export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})
export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
})
export const sourceSans3 = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans-3", display: "swap" })

/** Applied on <body> in app/layout.tsx so every pair's CSS variable is available. */
export const themeFontVariables = [
  inter.variable,
  poppins.variable,
  playfairDisplay.variable,
  sourceSans3.variable,
].join(" ")
