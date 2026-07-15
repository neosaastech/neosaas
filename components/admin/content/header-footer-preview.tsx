"use client"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { ResponsivePreviewFrame } from "./responsive-preview-frame"
import type { PayloadPageSummary, PayloadCategorySummary, PayloadSocialLink, HeaderBrandDisplay, PayloadPageBlock, PayloadLinkValue } from "@/lib/payload-bridge"
import type { HeaderConfig, FooterConfig, FooterModule, NavLink } from "@/types/site-nav"
import type { FormFieldDef } from "@/components/layers/form-layer"
import { linkValueToForm, type LinkFormValue } from "./payload-link-editor"

/**
 * Resolves a not-yet-saved LinkFormValue into the {label, href} shape the
 * public site actually renders — client-side equivalent of payload-cms's
 * resolveLinkField(), reading from the pages/categories the editor already
 * loaded for its link pickers instead of making a network call. Same
 * "editing and rendering share a React tree" approach as block-preview.tsx.
 */
function resolveLinkPreview(
  link: LinkFormValue,
  pages: PayloadPageSummary[],
  categories: PayloadCategorySummary[],
): { label: string; href: string } | undefined {
  if (link.kind === "url" || link.kind === "hardcoded") {
    return link.url ? { label: link.label || link.url, href: link.url } : undefined
  }
  const list = link.kind === "category" ? categories : pages
  const item = list.find((i) => String(i.id) === link.referenceId)
  if (!item) return undefined
  const fallbackLabel = "title" in item ? item.title : item.name
  return { label: link.label || fallbackLabel, href: item.path }
}

interface NavItemPreviewInput {
  link: LinkFormValue
  children: LinkFormValue[]
}

function resolveNavItemPreview(
  item: NavItemPreviewInput,
  pages: PayloadPageSummary[],
  categories: PayloadCategorySummary[],
): NavLink | undefined {
  const resolved = resolveLinkPreview(item.link, pages, categories)
  if (!resolved) return undefined
  const children = item.children
    .map((c) => resolveLinkPreview(c, pages, categories))
    .filter((c): c is { label: string; href: string } => Boolean(c))
  return { ...resolved, children: children.length ? children : undefined }
}

/**
 * Resolves one already-Payload-shaped Footer `modules` block (see
 * footer-editor.tsx's `formToModule`) into the FooterModule the real
 * SiteFooter expects. "columns" nested blocks aren't live-previewed here —
 * same established limit as block-preview.tsx's own "columns" case for
 * Pages ("no meaningful live preview from in-progress form state") — the
 * real published site still resolves them fully via payload-cms's
 * resolveFooterModule.
 */
function resolveFooterModulePreview(
  block: PayloadPageBlock,
  pages: PayloadPageSummary[],
  categories: PayloadCategorySummary[],
): FooterModule | undefined {
  if (block.blockType === "links") {
    const rawLinks = (block.links as { link?: PayloadLinkValue }[] | undefined) ?? []
    const links = rawLinks
      .map((l) => resolveLinkPreview(linkValueToForm(l.link), pages, categories))
      .filter((l): l is { label: string; href: string } => Boolean(l))
    return { type: "links", title: (block.title as string) || undefined, links }
  }
  if (block.blockType === "form") {
    return {
      type: "form",
      eyebrow: (block.eyebrow as string) || undefined,
      title: (block.title as string) || undefined,
      subtitle: (block.subtitle as string) || undefined,
      name: (block.name as string) || "",
      items: (block.items as FormFieldDef[] | undefined) ?? [],
      submitLabel: (block.submitLabel as string) || undefined,
      successMessage: (block.successMessage as string) || undefined,
    }
  }
  if (block.blockType === "columns") {
    return { type: "columns", columnCount: Number(block.columnCount) || 2, columns: [] }
  }
  return undefined
}

// Wraps the real public component in a bounded, non-interactive box — this
// is a preview of unsaved state, not a live embed: clicking the theme
// toggle or a nav link inside it must not affect the admin page itself.
const PREVIEW_WRAPPER_CLASS = "overflow-hidden rounded-lg border-2 border-dashed bg-background pointer-events-none select-none"

/** Live, unsaved-state preview of the header — renders the exact SiteHeader used on the public site. */
export function HeaderPreview({
  navItems,
  cta,
  brandDisplay,
  logo,
  showThemeSwitch,
  showLocaleSwitcher,
  showSocialLinks,
  showAuthButtons,
  socialLinks,
  pages,
  categories,
}: {
  navItems: NavItemPreviewInput[]
  cta: LinkFormValue
  brandDisplay: HeaderBrandDisplay
  logo: string
  showThemeSwitch: boolean
  showLocaleSwitcher: boolean
  showSocialLinks: boolean
  showAuthButtons: boolean
  socialLinks: PayloadSocialLink[]
  pages: PayloadPageSummary[]
  categories: PayloadCategorySummary[]
}) {
  const resolvedCta = resolveLinkPreview(cta, pages, categories)
  const headerConfig: HeaderConfig = {
    navItems: navItems.map((item) => resolveNavItemPreview(item, pages, categories)).filter((i): i is NavLink => Boolean(i)),
    ctaLabel: resolvedCta?.label,
    ctaHref: resolvedCta?.href,
    brandDisplay,
    logoUrl: logo || undefined,
    showThemeSwitch,
    showLocaleSwitcher,
    showSocialLinks,
    showAuthButtons,
    socialLinks,
  }

  return (
    <ResponsivePreviewFrame>
      <div className={PREVIEW_WRAPPER_CLASS}>
        <SiteHeader user={null} headerConfig={headerConfig} />
      </div>
    </ResponsivePreviewFrame>
  )
}

/** Live, unsaved-state preview of the footer — renders the exact SiteFooter used on the public site. */
export function FooterPreview({
  modules,
  brandDisplay,
  logo,
  copyrightText,
  tagline,
  pages,
  categories,
}: {
  modules: PayloadPageBlock[]
  brandDisplay: HeaderBrandDisplay
  logo: string
  copyrightText: string
  tagline?: string
  pages: PayloadPageSummary[]
  categories: PayloadCategorySummary[]
}) {
  const footerConfig: FooterConfig = {
    modules: modules
      .map((m) => resolveFooterModulePreview(m, pages, categories))
      .filter((m): m is FooterModule => Boolean(m)),
    copyrightText: copyrightText || undefined,
    tagline: tagline || undefined,
    brandDisplay,
    logoUrl: logo || undefined,
  }

  return (
    <ResponsivePreviewFrame>
      <div className={PREVIEW_WRAPPER_CLASS}>
        <SiteFooter footerConfig={footerConfig} />
      </div>
    </ResponsivePreviewFrame>
  )
}
