import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html"
import type { PayloadPageBlock } from "@/lib/payload-bridge"
import type { PageLayerRow } from "@/components/layers/block-renderer"

/**
 * Maps a Payload block (as returned by the REST API at depth=2, i.e. `image`
 * populated as `{ url }`) into the exact props shape lib/layers/registry.ts
 * expects — the same transformation payload-cms's own
 * src/sync/targets/neosaas-app.ts:mapBlockToProps() does, reimplemented here
 * because Live Preview fetches straight from Payload's API and never goes
 * through that sync path (drafts are never synced — only published content
 * is). Keep both in sync when adding a block type, same two-repo mirror
 * discipline as everything else in lib/layers/.
 */
function extractMediaUrl(value: unknown): string | undefined {
  if (value && typeof value === "object" && "url" in value) {
    return (value as { url?: string }).url ?? undefined
  }
  return undefined
}

interface LinkFieldValue {
  type?: "reference" | "custom"
  reference?: { relationTo: string; value: string | Record<string, unknown> } | string
  url?: string
  label?: string
}

/**
 * Sync counterpart of payload-cms's resolveLinkField (src/sync/targets/
 * neosaas-app.ts) — this file's whole premise is "reimplement the same
 * transform, no async DB round-trip needed" since Live Preview already
 * fetches at depth=2 (references pre-populated). Was missing entirely:
 * "hero"/"cta-banner" here still assumed flat ctaLabel/ctaHref fields that
 * haven't existed since those blocks moved to the shared linkField() —
 * confirmed live 2026-07-09 on a real page, preview 404'd because this
 * silently produced `href: undefined` well before the "hero-split" block
 * (never handled at all) actually threw.
 */
function resolveLinkFieldSync(value: unknown): { label?: string; href?: string } | undefined {
  const link = value as LinkFieldValue | undefined
  if (!link) return undefined

  if (link.type === "custom") {
    return link.url ? { label: link.label ?? undefined, href: link.url } : undefined
  }

  const ref = link.reference
  if (!ref) return undefined
  const populated = typeof ref === "object" ? ref.value : undefined
  const relationTo = typeof ref === "object" ? ref.relationTo : undefined
  if (!populated || typeof populated !== "object") return undefined

  const href = relationTo === "blog-posts" ? `/blog/${populated.slug}` : ((populated.path as string) ?? `/${populated.slug}`)
  return { label: link.label ?? undefined, href }
}

// Same conversion payload-cms's sync/targets/neosaas-app.ts applies at
// publish time (convertSubtitle) — Live Preview fetches drafts straight
// from Payload, bypassing that sync path entirely, so `subtitle`'s Lexical
// JSON (fromRegistry.ts's convertField override) would otherwise reach the
// site as a raw object instead of the HTML string every Layer component
// expects.
function convertSubtitle(subtitle: unknown): string | undefined {
  return subtitle ? convertLexicalToHTML({ data: subtitle as never, disableContainer: true }) : undefined
}

function mapBlockToProps(block: PayloadPageBlock): Record<string, unknown> {
  switch (block.blockType) {
    case "hero": {
      const cta = resolveLinkFieldSync(block.cta)
      const secondaryCta = resolveLinkFieldSync(block.secondaryCta)
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title,
        subtitle: convertSubtitle(block.subtitle),
        trustPills: ((block.trustPills as Array<{ icon: string; label: string }>) ?? []).length
          ? (block.trustPills as Array<{ icon: string; label: string }>).map((p) => ({ icon: p.icon, label: p.label }))
          : undefined,
        ctaLabel: cta?.label,
        ctaHref: cta?.href,
        secondaryCtaLabel: secondaryCta?.label,
        secondaryCtaHref: secondaryCta?.href,
        imageUrl: extractMediaUrl(block.image),
        videoUrl: extractMediaUrl(block.video),
      }
    }
    case "hero-split": {
      const cta = resolveLinkFieldSync(block.cta)
      const secondaryCta = resolveLinkFieldSync(block.secondaryCta)
      const highlights = (block.highlights as Array<{ icon: string; label: string; featured?: boolean }>) ?? []
      return {
        eyebrow: block.eyebrow ?? undefined,
        brandName: block.brandName ?? undefined,
        title: block.title,
        subtitle: convertSubtitle(block.subtitle),
        highlights: highlights.length
          ? highlights.map((h) => ({ icon: h.icon, label: h.label, featured: h.featured ?? undefined }))
          : undefined,
        ctaLabel: cta?.label,
        ctaHref: cta?.href,
        secondaryCtaLabel: secondaryCta?.label,
        secondaryCtaHref: secondaryCta?.href,
        imageUrl: extractMediaUrl(block.image),
      }
    }
    case "columns": {
      const rawColumns = (block.columns as Array<{ blocks?: PayloadPageBlock[] }>) ?? []
      return {
        columnCount: Number(block.columnCount) || 2,
        columns: rawColumns.map((column) => ({
          blocks: (column.blocks ?? []).map((child, i) => ({
            layerType: child.blockType,
            props: { ...mapBlockToProps(child), blockSettings: child.blockSettings ?? undefined },
            id: child.id ?? String(i),
          })),
        })),
      }
    }
    case "feature-grid": {
      const items = (block.items as Array<Record<string, unknown>>) ?? []
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        items: items.map((item) => ({
          icon: item.icon,
          iconSize: item.iconSize ?? undefined,
          title: item.title,
          description: item.description,
          bullets: ((item.bullets as Array<{ text: string }>) ?? []).map((b) => b.text),
        })),
      }
    }
    case "pricing-table": {
      const items = (block.items as Array<Record<string, unknown>>) ?? []
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        items: items.map((item) => ({
          name: item.name,
          price: item.price,
          period: item.period ?? undefined,
          bullets: ((item.bullets as Array<{ text: string }>) ?? []).map((b) => b.text),
          ctaLabel: item.ctaLabel,
          ctaHref: item.ctaHref,
          highlighted: item.highlighted ?? undefined,
        })),
      }
    }
    case "testimonials": {
      const items = (block.items as Array<Record<string, unknown>>) ?? []
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        items: items.map((item) => ({
          body: item.body,
          authorName: item.authorName,
          authorRole: item.authorRole ?? undefined,
          imageUrl: extractMediaUrl(item.image),
          rating: item.rating ?? undefined,
          metric: item.metric ?? undefined,
        })),
      }
    }
    case "cta-banner": {
      const cta = resolveLinkFieldSync(block.cta)
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title,
        subtitle: convertSubtitle(block.subtitle),
        ctaLabel: cta?.label,
        ctaHref: cta?.href,
      }
    }
    case "welcome-banner":
      return {
        title: block.title,
        subtitle: block.subtitle ?? undefined,
        ctaLabel: block.ctaLabel ?? undefined,
        ctaHref: block.ctaHref ?? undefined,
      }
    case "icon-showcase": {
      const items = (block.items as Array<Record<string, unknown>>) ?? []
      return {
        items: items.map((item) => ({
          icon: String(item.icon),
          label: String(item.label),
          highlighted: item.highlighted === true,
        })),
        imageUrl: extractMediaUrl(block.image),
        videoUrl: extractMediaUrl(block.video),
        overlayIcons: block.overlayIcons === false ? false : undefined,
      }
    }
    case "form": {
      const items = (block.items as Array<Record<string, unknown>>) ?? []
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        subtitle: convertSubtitle(block.subtitle),
        name: block.name,
        items: items.map((item) => ({
          name: item.name,
          label: item.label,
          type: item.type,
          required: item.required ?? undefined,
        })),
        submitLabel: block.submitLabel ?? undefined,
        successMessage: block.successMessage ?? undefined,
      }
    }
    case "blog-list":
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        subtitle: convertSubtitle(block.subtitle),
        limit: block.limit ?? undefined,
        categorySlug: block.categorySlug ?? undefined,
      }
    case "category-list":
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        subtitle: convertSubtitle(block.subtitle),
        limit: block.limit ?? undefined,
      }
    case "content":
      return {
        bodyHtml: block.body ? convertLexicalToHTML({ data: block.body as never, disableContainer: true }) : "",
      }
    case "code-showcase":
      return {
        title: block.title ?? undefined,
        subtitle: convertSubtitle(block.subtitle),
        blockTitle: block.blockTitle ?? undefined,
        blockDescription: block.blockDescription ?? undefined,
        code: block.code,
      }
    case "features-list": {
      const items = (block.items as Array<Record<string, unknown>>) ?? []
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        subtitle: convertSubtitle(block.subtitle),
        items: items.map((item) => ({ title: item.title, description: item.description })),
        imageUrl: extractMediaUrl(block.image),
      }
    }
    case "logo-cloud": {
      const items = (block.items as Array<Record<string, unknown>>) ?? []
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        subtitle: convertSubtitle(block.subtitle),
        items: items.map((item) => ({
          name: item.name,
          imageUrl: extractMediaUrl(item.image),
          markup: item.markup ?? undefined,
        })),
      }
    }
    default:
      throw new Error(`[preview] Unknown block type: ${block.blockType}`)
  }
}

export function mapPayloadLayoutToLayerRows(layout: PayloadPageBlock[]): PageLayerRow[] {
  return layout.map((block, position) => ({
    id: block.id ? String(block.id) : String(position),
    layerType: block.blockType,
    props: { ...mapBlockToProps(block), blockSettings: block.blockSettings ?? undefined },
  }))
}
