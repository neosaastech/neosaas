/**
 * "grapesjs-design" layer (Pilier C — Calques de page). Registered in
 * lib/layers/registry.ts. GrapesJS itself never runs here — the admin-side
 * editor (payload-cms's GrapesJsEditorField) already exported plain HTML/CSS
 * on save; this just renders that static markup, same pattern as ContentLayer.
 */
export interface GrapesJsDesignLayerProps {
  html?: string
  css?: string
}

export function GrapesJsDesignLayer({ html, css }: GrapesJsDesignLayerProps) {
  if (!html) return null
  return (
    <div>
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
