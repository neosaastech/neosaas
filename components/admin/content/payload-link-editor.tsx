"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LinkCombobox, type LinkOption } from "./link-field-input"
import type { PayloadLinkValue, PayloadPageSummary, PayloadCategorySummary } from "@/lib/payload-bridge"
import { HARDCODED_LINK_OPTIONS } from "@/lib/hardcoded-pages"

/**
 * linkField() in payload-cms is a structured group ({type, newTab,
 * reference, url, label}) with a *polymorphic* reference
 * (relationTo: ['pages','blog-posts','categories']) — that flattening to
 * {label,href} only happens inside payload-cms's own sync pipeline
 * (resolveLinkField), never over the admin REST API this bridge talks to.
 * This flat form-state shape is this editor's own convenience representation,
 * converted to/from the real Payload shape at the edges. `kind` collapses
 * Payload's (type + reference.relationTo) into one selector: internal Page,
 * internal Category, or external URL.
 *
 * `"hardcoded"` (Charles, 2026-07-14: "ces pages doivent être intégrées à
 * l'interne dans un sélecteur ... pas via URL externe") is an editor-only
 * kind — Pricing/Privacy/Terms aren't real Payload docs (no page ID to
 * reference), so they can't be `"page"`. They still store as `"custom"`
 * (same as `"url"`) once saved — `"hardcoded"` only exists so the UI keeps
 * the "Page" tab active and the right item preselected, instead of
 * silently jumping to "External URL".
 */
export type LinkKind = "page" | "category" | "hardcoded" | "url"

export interface LinkFormValue {
  kind: LinkKind
  label: string
  url: string
  referenceId: string
  newTab: boolean
}

export function emptyLink(): LinkFormValue {
  return { kind: "page", label: "", url: "", referenceId: "", newTab: false }
}

export function linkValueToForm(link?: PayloadLinkValue | null): LinkFormValue {
  if (!link) return emptyLink()
  if (link.type === "reference") {
    const relationTo = typeof link.reference === "object" && link.reference ? link.reference.relationTo : "pages"
    const referenceId =
      typeof link.reference === "object" && link.reference
        ? String(link.reference.value)
        : link.reference != null
          ? String(link.reference)
          : ""
    return {
      kind: relationTo === "categories" ? "category" : "page",
      label: link.label ?? "",
      url: "",
      referenceId,
      newTab: link.newTab ?? false,
    }
  }
  const url = link.url ?? ""
  const isHardcoded = HARDCODED_LINK_OPTIONS.some((o) => o.value === url)
  return { kind: isHardcoded ? "hardcoded" : "url", label: link.label ?? "", url, referenceId: "", newTab: link.newTab ?? false }
}

export function formToLinkValue(form: LinkFormValue): PayloadLinkValue {
  if (form.kind === "url" || form.kind === "hardcoded") {
    return { type: "custom", label: form.label, newTab: form.newTab, url: form.url }
  }
  const relationTo = form.kind === "category" ? "categories" : "pages"
  return {
    type: "reference",
    label: form.label,
    newTab: form.newTab,
    reference: form.referenceId ? { relationTo, value: form.referenceId } : null,
  }
}

const HARDCODED_COMBOBOX_PREFIX = "hardcoded:"

/**
 * One link's fields — used for header nav items, cta, and footer column links
 * alike. Picking a Page/Category auto-fills the label from that item's
 * title/name when the label is still empty (Charles, 2026-07-13: "le label
 * du nav item qui apparaît automatiquement"), so an editor rarely types it.
 * The "Page" tab is a single searchable combobox (LinkCombobox, shared with
 * link-field-input.tsx) mixing real Payload pages with Pricing/Privacy/
 * Terms — no separate "External URL" detour needed to reach them.
 */
export function PayloadLinkEditor({
  value,
  onChange,
  pages,
  categories = [],
}: {
  value: LinkFormValue
  onChange: (value: LinkFormValue) => void
  pages: PayloadPageSummary[]
  categories?: PayloadCategorySummary[]
}) {
  const pageOptions: LinkOption[] = [
    ...pages.map((p) => ({ value: String(p.id), label: `${p.title} (${p.path})` })),
    ...HARDCODED_LINK_OPTIONS.map((o) => ({ value: `${HARDCODED_COMBOBOX_PREFIX}${o.value}`, label: o.label })),
  ]
  const categoryOptions: LinkOption[] = categories.map((c) => ({ value: String(c.id), label: `${c.name} (${c.path})` }))

  const pickPage = (comboboxValue: string) => {
    if (comboboxValue.startsWith(HARDCODED_COMBOBOX_PREFIX)) {
      const url = comboboxValue.slice(HARDCODED_COMBOBOX_PREFIX.length)
      let label = value.label
      if (!label.trim()) label = HARDCODED_LINK_OPTIONS.find((o) => o.value === url)?.label.split(" — ")[0] ?? ""
      onChange({ ...value, kind: "hardcoded", url, referenceId: "", label })
      return
    }
    let label = value.label
    if (!label.trim()) label = pages.find((p) => String(p.id) === comboboxValue)?.title ?? ""
    onChange({ ...value, kind: "page", referenceId: comboboxValue, url: "", label })
  }

  const pickCategory = (categoryId: string) => {
    let label = value.label
    if (!label.trim()) label = categories.find((c) => String(c.id) === categoryId)?.name ?? ""
    onChange({ ...value, kind: "category", referenceId: categoryId, label })
  }

  const pageComboboxValue = value.kind === "hardcoded" ? `${HARDCODED_COMBOBOX_PREFIX}${value.url}` : value.kind === "page" ? value.referenceId : ""

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto] items-end">
      <div>
        <Label className="text-xs">Label</Label>
        <Input
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="Auto from the page/category"
        />
      </div>
      <div>
        <Label className="text-xs">Type</Label>
        <Select
          value={value.kind === "hardcoded" ? "page" : value.kind}
          onValueChange={(kind) => onChange({ ...value, kind: kind as LinkKind, referenceId: "", url: "" })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="page">Page</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="url">External URL</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.kind === "url" ? (
        <div>
          <Label className="text-xs">URL</Label>
          <Input value={value.url} onChange={(e) => onChange({ ...value, url: e.target.value })} placeholder="https://..." />
        </div>
      ) : value.kind === "category" ? (
        <div>
          <Label className="text-xs">Category</Label>
          <LinkCombobox
            id="link-category"
            value={value.referenceId}
            options={categoryOptions}
            loaded
            loadingLabel="Loading categories..."
            placeholderLabel="Choose a category..."
            searchPlaceholder="Search by name..."
            emptyLabel="No category found."
            onSelect={pickCategory}
            onClear={() => onChange({ ...value, referenceId: "" })}
          />
        </div>
      ) : (
        <div>
          <Label className="text-xs">Page</Label>
          <LinkCombobox
            id="link-page"
            value={pageComboboxValue}
            options={pageOptions}
            loaded
            loadingLabel="Loading pages..."
            placeholderLabel="Choose a page..."
            searchPlaceholder="Search by title or path..."
            emptyLabel="No page found."
            onSelect={pickPage}
            onClear={() => onChange({ ...value, kind: "page", referenceId: "", url: "" })}
          />
        </div>
      )}
      <div className="flex items-center gap-2 pb-2">
        <Checkbox checked={value.newTab} onCheckedChange={(checked) => onChange({ ...value, newTab: checked === true })} />
        <Label className="text-xs font-normal">New tab</Label>
      </div>
    </div>
  )
}
