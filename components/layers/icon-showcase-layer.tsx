/**
 * "icon-showcase" layer — marketing icon grid panel.
 * @see components/preline/marketing/icon-showcase-panel.tsx
 */
import {
  PrelineIconShowcasePanel,
  type PrelineIconShowcasePanelProps,
} from "@/components/preline/marketing/icon-showcase-panel"

export type IconShowcaseLayerProps = PrelineIconShowcasePanelProps

export function IconShowcaseLayer(props: IconShowcaseLayerProps) {
  return (
    <div className="flex justify-center">
      <PrelineIconShowcasePanel {...props} />
    </div>
  )
}
