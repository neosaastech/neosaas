"use client"

import { useEffect, useState } from "react"
import { getContentAuthors } from "@/app/actions/pages"
import { LinkCombobox, type LinkOption } from "./link-field-input"

/**
 * "authorId" resolves to a real Payload user (id 5 "Abbygael Samantha" etc.)
 * — Charles (2026-08-13): "le module en front ne correspond à aucune
 * personne dans les admin du projet. c'est frauduleux." Same searchable
 * Popover+Command combobox as CategorySlugField, fed by getContentAuthors()
 * instead of getContentCategories().
 */
export function AuthorPickerField({ name, value, onChange }: { name: string; value: string; onChange: (next: string) => void }) {
  const [options, setOptions] = useState<LinkOption[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getContentAuthors().then((result) => {
      if (result.success) {
        setOptions(result.data.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })))
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
        loadingLabel="Loading authors..."
        placeholderLabel="No author"
        searchPlaceholder="Search by name or email..."
        emptyLabel="No author found."
        onSelect={onChange}
        onClear={() => onChange("")}
      />
    </div>
  )
}
