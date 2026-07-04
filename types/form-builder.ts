/**
 * Metadata-Driven UI — one FeatureConfig describes an entire admin/dashboard
 * screen (list + create/edit form) backed by a single Payload collection.
 * DynamicTable/DynamicForm (components/dynamic/) and the catch-all route
 * (app/(private)/dashboard/[feature]/page.tsx) are all driven by this type —
 * adding a new dashboard feature means writing one FeatureConfig, not a new
 * page/hooks/table by hand. See lib/dashboard/feature-registry.ts.
 */

export type FeatureFieldType = "text" | "number" | "select" | "textarea"

export interface FeatureFieldOption {
  label: string
  value: string
}

export interface FeatureFieldConfig {
  /** Property name on the Payload document — also the form field's name. */
  name: string
  /** Human-readable label shown in the form and (if tableShow) the table header. */
  label: string
  type: FeatureFieldType
  /** Required for type "select" — ignored otherwise. */
  options?: FeatureFieldOption[]
  required?: boolean
  /** Whether this field gets its own column in DynamicTable. Fields not
   * shown in the table are still editable in DynamicForm. */
  tableShow?: boolean
}

export interface FeatureConfig {
  /** Shown as the page's <h1> and the "New" button label. */
  title: string
  /**
   * Payload collection slug (e.g. "quotes", "blog-posts") — NOT a full URL.
   * Requests go through this app's own /api/dashboard/[feature] proxy,
   * which is the only thing allowed to hold the Payload service credential
   * (see lib/payload-bridge.ts) — a browser-side fetch straight to Payload
   * would require exposing that key client-side.
   */
  endpoint: string
  fields: FeatureFieldConfig[]
}
