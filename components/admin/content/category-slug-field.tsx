"use client"

import { useEffect, useState } from "react"
import { getContentCategories } from "@/app/actions/pages"
import { LinkCombobox, type LinkOption } from "./link-field-input"

/**
 * "blog-list"'s `categorySlug` fell through to the generic plain-text
 * branch — an editor had to type a raw slug from memory, no different from
 * the *Href fields before LinkFieldInput existed. Same searchable
 * Popover+Command combobox as everywhere else a Payload doc gets picked
 * (LinkCombobox, already reused by payload-link-editor.tsx's own Category
 * selector) — just fed active categories' slugs instead of pages/hrefs.
 */
export function CategorySlugField({ name, value, onChange }: { name: string; value: string; onChange: (next: string) => void }) {
  const [options, setOptions] = useState<LinkOption[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getContentCategories().then((result) => {
      if (result.success) {
        setOptions(result.data.map((c) => ({ value: c.slug, label: `${c.name} (${c.path})` })))
      }
      setLoaded(true)
    })
  }, [])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={name}>
        {name}
      </label>
      <LinkCombobox
        id={name}
        value={value}
        options={options}
        loaded={loaded}
        loadingLabel="Loading categories..."
        placeholderLabel="All categories"
        searchPlaceholder="Search by name..."
        emptyLabel="No category found."
        onSelect={onChange}
        onClear={() => onChange("")}
      />
    </div>
  )
}
