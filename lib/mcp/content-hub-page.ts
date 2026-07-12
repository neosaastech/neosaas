import { z } from "zod"
import type { PageWriteInput, PayloadPageBlock } from "@/lib/payload-bridge"
import { clientLayerRegistry } from "@/lib/layers/registry-client"
import { mapPayloadLayoutToLayerRows } from "@/lib/layers/from-payload"

/** Block types available in Content Hub (`AddBlockSelect` / `PageEditor`). */
export const CONTENT_HUB_BLOCK_TYPES = Object.keys(clientLayerRegistry)

export const pageWriteInputSchema = z.object({
  title: z.string().min(1),
  slug: z.string(),
  pageType: z.string().optional(),
  category: z.union([z.string(), z.number(), z.null()]).optional(),
  layout: z.array(z.object({ blockType: z.string().min(1) }).passthrough()),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    })
    .optional(),
  includeSiteNameInTitle: z.boolean().optional(),
  _status: z.enum(["draft", "published"]),
})

export interface ContentPagePlan {
  input: PageWriteInput
  locale: string
  validation: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }
  previewLayers: Array<{ layerType: string; props: unknown }>
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

function validateLayoutBlock(block: PayloadPageBlock, index: number): string | null {
  const def = clientLayerRegistry[block.blockType]
  if (!def) return `layout[${index}] unknown blockType "${block.blockType}"`

  // columns uses a dedicated nested editor — structure-only check here
  if (block.blockType === "columns") return null

  const { blockType: _bt, id: _id, blockSettings: _bs, ...props } = block
  const parsed = def.propsSchema.safeParse(props)
  if (!parsed.success) {
    return `layout[${index}] invalid "${block.blockType}" props: ${parsed.error.message}`
  }
  return null
}

export function validateContentHubPageInput(
  input: PageWriteInput,
  options: { strictLayout?: boolean } = {},
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  const parsed = pageWriteInputSchema.safeParse(input)
  if (!parsed.success) {
    errors.push(parsed.error.message)
    return { valid: false, errors, warnings }
  }

  if (input._status === "published" && input.layout.length === 0) {
    errors.push("Published pages must include at least one block (same rule as PageEditor)")
  }

  for (const blockType of input.layout.map((b) => b.blockType)) {
    if (!CONTENT_HUB_BLOCK_TYPES.includes(blockType)) {
      errors.push(`Block type "${blockType}" is not available in Content Hub`)
    }
  }

  if (options.strictLayout !== false) {
    for (const [index, block] of input.layout.entries()) {
      const blockError = validateLayoutBlock(block, index)
      if (blockError) errors.push(blockError)
    }
  }

  if (!input.slug && input.title) {
    warnings.push("Empty slug — home page uses slug '' in Content Hub")
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Propose a PageWriteInput using the same content model as `PageEditor`
 * (`components/admin/content/page-editor.tsx`), not Puck/set_layers.
 */
export function proposeContentPageFromIntent(input: {
  intent: string
  title?: string
  slug?: string
  pageType?: string
  locale?: string
  status?: "draft" | "published"
}): ContentPagePlan {
  const title = input.title ?? input.intent.replace(/\.$/, "").slice(0, 80)
  const slug = input.slug ?? slugify(title)
  const lower = input.intent.toLowerCase()

  const layout: PayloadPageBlock[] = [
    {
      blockType: "hero",
      title,
      subtitle: "Built through the Content Hub page model",
      ctaLabel: "Get started",
      ctaHref: "/pricing",
    },
  ]

  if (lower.includes("feature") || lower.includes("grid")) {
    layout.push({
      blockType: "feature-grid",
      title: "Key capabilities",
      items: [
        {
          icon: "Zap",
          title: "Fast delivery",
          description: "Ship with standardized blocks",
          bullets: ["Auth", "Admin", "Payments"],
        },
      ],
    })
  }

  if (lower.includes("cta") || lower.includes("contact")) {
    layout.push({
      blockType: "cta-banner",
      title: "Need help?",
      subtitle: "Talk to our team",
      ctaLabel: "Contact support",
      ctaHref: "/dashboard/support",
    })
  }

  const pageInput: PageWriteInput = {
    title,
    slug,
    pageType: input.pageType ?? "landing",
    category: null,
    layout,
    seo: {
      metaTitle: title,
      metaDescription: `Learn more about ${title}`,
    },
    includeSiteNameInTitle: true,
    _status: input.status ?? "draft",
  }

  const validation = validateContentHubPageInput(pageInput)
  const previewLayers = mapPayloadLayoutToLayerRows(pageInput.layout).map((row) => ({
    layerType: row.layerType,
    props: row.props,
  }))

  return {
    input: pageInput,
    locale: input.locale ?? "en",
    validation,
    previewLayers,
  }
}

/** Mirrors `PageEditor.handleSave` payload shape before `saveContentPage`. */
export function planContentPageSave(input: {
  page: PageWriteInput
  locale?: string
}): ContentPagePlan {
  const sanitizedLayout = JSON.parse(JSON.stringify(input.page.layout)) as PayloadPageBlock[]
  const pageInput: PageWriteInput = {
    ...input.page,
    layout: sanitizedLayout,
  }

  const validation = validateContentHubPageInput(pageInput)
  const previewLayers = mapPayloadLayoutToLayerRows(pageInput.layout).map((row) => ({
    layerType: row.layerType,
    props: row.props,
  }))

  return {
    input: pageInput,
    locale: input.locale ?? "en",
    validation,
    previewLayers,
  }
}
