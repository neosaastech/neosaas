import type { PageLayerRow } from "@/components/layers/block-renderer"
import { getPageForPreview } from "@/lib/payload-bridge"
import { mapPayloadLayoutToLayerRows } from "@/lib/layers/from-payload"

/** Live Preview path — draft straight from Payload (never in page_layers until publish). */
export async function loadPreviewLayers(pagePath: string, locale: string): Promise<PageLayerRow[]> {
  try {
    const doc = await getPageForPreview(pagePath, locale)
    return doc ? mapPayloadLayoutToLayerRows(doc.layout ?? []) : []
  } catch (error) {
    console.error(`Failed to load preview for ${pagePath}:`, error)
    return []
  }
}
