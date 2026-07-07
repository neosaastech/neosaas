import { PreviewBanner } from "@/components/common/preview-banner"
import { RefreshPreview } from "@/components/common/refresh-preview"

/** Live Preview chrome — banner + auto-refresh on Payload save. */
export function PreviewChrome() {
  return (
    <>
      <PreviewBanner />
      <RefreshPreview />
    </>
  )
}
