export interface HardcodedPageOption {
  value: string
  label: string
}

/**
 * Charles (2026-07-09): "des pages de type automatique comme rgpd et
 * produits" — /pricing and /legal/* are real, linkable pages but aren't
 * driven by Payload's page_layers table (hardcoded business/payment logic,
 * see pages-settings.tsx's own "stay hardcoded" note) so they never show up
 * in getContentPages(). Listed here by hand since there's no collection to
 * query them from — locale-agnostic paths, same convention as Payload
 * pages' own `path` (locale prefix is added at render time, not stored).
 * Shared by link-field-input.tsx (page-builder block links) and
 * payload-link-editor.tsx (header/footer nav links) so every link picker in
 * the admin offers the same set — previously only the former did.
 */
export const HARDCODED_LINK_OPTIONS: HardcodedPageOption[] = [
  { value: "/pricing", label: "Pricing — /pricing" },
  { value: "/legal/privacy", label: "Privacy policy — /legal/privacy" },
  { value: "/legal/terms", label: "Terms of service — /legal/terms" },
]
