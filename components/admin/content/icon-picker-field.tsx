"use client"

import { useMemo, useState } from "react"
import * as LucideIcons from "lucide-react"
import * as TablerIcons from "@tabler/icons-react"
import * as HeroIcons from "@heroicons/react/24/outline"
import * as SimpleIcons from "react-icons/si"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { LUCIDE_ICON_NAMES } from "@/lib/icons/lucide-icon-names"
import { ICON_LIBRARIES, ICON_LIBRARY_LABELS, parseIconValue, type IconLibrary } from "@/components/ui/icon"

type IconComponent = React.ComponentType<{ className?: string }>

const ICON_MAPS: Record<IconLibrary, Record<string, IconComponent>> = {
  lucide: LucideIcons as unknown as Record<string, IconComponent>,
  tabler: TablerIcons as unknown as Record<string, IconComponent>,
  heroicons: HeroIcons as unknown as Record<string, IconComponent>,
  brands: SimpleIcons as unknown as Record<string, IconComponent>,
}

// Lucide has a pre-generated full name list (lib/icons/lucide-icon-names.ts)
// — Tabler/Heroicons/Simple Icons don't need one, their name lists are just
// every function export of the already-imported namespace, computed once.
const ICON_NAMES: Record<IconLibrary, string[]> = {
  lucide: LUCIDE_ICON_NAMES,
  tabler: Object.keys(TablerIcons).filter((k) => typeof (TablerIcons as unknown as Record<string, unknown>)[k] === "function"),
  heroicons: Object.keys(HeroIcons).filter((k) => typeof (HeroIcons as unknown as Record<string, unknown>)[k] === "function"),
  brands: Object.keys(SimpleIcons).filter((k) => typeof (SimpleIcons as unknown as Record<string, unknown>)[k] === "function"),
}

/**
 * Charles (2026-07-10): "dans le module feature grid on peut inserer des
 * icons. sauf que l'on a pas le selecteur des bibliotheques d'icone. on
 * doit recuperer toutes avec un moteur de recherche a l'interieur du
 * selecteur." Replaces the plain text input (icon field, typed from memory
 * against components/ui/icon.tsx's Lucide export name) with a searchable
 * combobox over every lucide-react icon (LUCIDE_ICON_NAMES — the full set,
 * not a curated subset).
 *
 * Charles (2026-07-15): "il va falloir ajouter plusieurs bibliotheques
 * d'icone dans nos modules. en plus elles sont existantes dans Neosaas" —
 * @tabler/icons-react and @heroicons/react were already installed
 * dependencies, already wired into components/ui/icon.tsx's multi-library
 * Icon component, just never reachable from this specific picker (which
 * hardcoded lucide-react only). Adds a library selector; the stored value
 * only gains a "tabler:"/"heroicons:" prefix when a non-Lucide icon is
 * picked (parseIconValue, components/ui/icon.tsx) — a bare name (all
 * existing content) still means Lucide, unchanged.
 */
export function IconPickerField({
  name,
  value,
  onChange,
}: {
  name: string
  value: string
  onChange: (next: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const parsed = parseIconValue(value?.trim() ?? "")
  const [library, setLibrary] = useState<IconLibrary>(parsed.library)
  const selected = parsed.name
  const SelectedIcon = selected ? ICON_MAPS[parsed.library][selected] : undefined

  // The picked value might not be a real export in its library (legacy
  // typo, or a version bump renamed/dropped it) — surfaced explicitly
  // instead of the picker silently acting like nothing is selected.
  const isUnknown = Boolean(selected) && !SelectedIcon

  // cmdk's built-in filter/sort re-parents every <CommandItem> via
  // appendChild on each keystroke to reorder by score — with 1534+ ungrouped
  // items that throws "Failed to execute 'appendChild' on 'Node': parameter
  // 1 is not of type 'Node'" (confirmed in a real production build, not a
  // dev-only Strict Mode artifact: every keystroke crashed the search
  // silently, 2026-07-10). shouldFilter={false} disables that DOM-sorting
  // path entirely; we filter (and cap) the list ourselves instead, which
  // also avoids rendering 1500+ DOM nodes on every open.
  const names = useMemo(() => {
    const q = search.trim().toLowerCase()
    const pool = ICON_NAMES[library]
    const matches = q ? pool.filter((n) => n.toLowerCase().includes(q)) : pool
    return matches.slice(0, 150)
  }, [search, library])

  function selectIcon(iconName: string) {
    onChange(library === "lucide" ? iconName : `${library}:${iconName}`)
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>Icon</Label>
      <div className="flex gap-2">
        <Select
          value={library}
          onValueChange={(next) => {
            setLibrary(next as IconLibrary)
            setSearch("")
          }}
        >
          <SelectTrigger className="w-[140px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ICON_LIBRARIES.map((lib) => (
              <SelectItem key={lib} value={lib}>
                {ICON_LIBRARY_LABELS[lib]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setSearch("")
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id={name}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between font-normal"
            >
              <span className="flex items-center gap-2 truncate">
                {SelectedIcon ? (
                  <SelectedIcon className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded border border-dashed" />
                )}
                {selected || "Select icon..."}
                {isUnknown && <span className="text-xs text-destructive">(unknown icon)</span>}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Search icons..." value={search} onValueChange={setSearch} />
              <CommandList className="max-h-80">
                <CommandEmpty>No icon found.</CommandEmpty>
                {/* Charles (2026-07-10): "c'est quoi ce selecteur d'icone. une
                    vraie merde" — the grid used to show bare glyphs with no
                    visible label, only a hover tooltip. Without already
                    knowing the exact export name, there was no way to browse:
                    scanning ~150 unlabeled icons to find e.g. "server" or
                    "rocket" meant hovering each one individually. Icon + name
                    side by side, one per row, so the list is actually
                    scannable and the name is readable without hovering. */}
                <div className="p-1">
                  {names.map((iconName) => {
                    const ItemIcon = ICON_MAPS[library][iconName]
                    if (!ItemIcon) return null
                    const isSelected = library === parsed.library && selected === iconName
                    return (
                      <CommandItem
                        key={iconName}
                        value={iconName}
                        onSelect={() => selectIcon(iconName)}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 aria-selected:bg-muted",
                          isSelected && "bg-primary/10",
                        )}
                      >
                        <ItemIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">{iconName}</span>
                        {isSelected && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                      </CommandItem>
                    )
                  })}
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
