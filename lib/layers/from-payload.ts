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

function mapBlockToProps(block: PayloadPageBlock): Record<string, unknown> {
  switch (block.blockType) {
    case "hero":
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title,
        subtitle: block.subtitle ?? undefined,
        trustPills: ((block.trustPills as Array<{ icon: string; label: string }>) ?? []).length
          ? (block.trustPills as Array<{ icon: string; label: string }>).map((p) => ({ icon: p.icon, label: p.label }))
          : undefined,
        ctaLabel: block.ctaLabel ?? undefined,
        ctaHref: block.ctaHref ?? undefined,
        secondaryCtaLabel: block.secondaryCtaLabel ?? undefined,
        secondaryCtaHref: block.secondaryCtaHref ?? undefined,
        imageUrl: extractMediaUrl(block.image),
      }
    case "feature-grid": {
      const items = (block.items as Array<Record<string, unknown>>) ?? []
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        items: items.map((item) => ({
          icon: item.icon,
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
    case "cta-banner":
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title,
        subtitle: block.subtitle ?? undefined,
        ctaLabel: block.ctaLabel,
        ctaHref: block.ctaHref,
      }
    case "form": {
      const items = (block.items as Array<Record<string, unknown>>) ?? []
      return {
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? undefined,
        subtitle: block.subtitle ?? undefined,
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
        subtitle: block.subtitle ?? undefined,
        limit: block.limit ?? undefined,
        categorySlug: block.categorySlug ?? undefined,
      }
    case "content":
      return {
        bodyHtml: block.body ? convertLexicalToHTML({ data: block.body as never }) : "",
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
