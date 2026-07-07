/**
 * "welcome-banner" layer — gradient banner for dashboard-style welcome sections.
 * @see components/preline/application/welcome-banner.tsx
 */
import {
  PrelineWelcomeBanner,
  type PrelineWelcomeBannerProps,
} from "@/components/preline/application/welcome-banner"

export type WelcomeBannerLayerProps = PrelineWelcomeBannerProps

export function WelcomeBannerLayer(props: WelcomeBannerLayerProps) {
  return <PrelineWelcomeBanner {...props} />
}
