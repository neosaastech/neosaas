"use client"

import { useMemo, useState } from "react"
import * as LucideIcons from "lucide-react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { LUCIDE_ICON_NAMES } from "@/lib/icons/lucide-icon-names"

type LucideIconComponent = LucideIcons.LucideIcon
const ICON_MAP = LucideIcons as unknown as Record<string, LucideIconComponent>

/**
 * Charles (2026-07-10): "dans le module feature grid on peut inserer des
 * icons. sauf que l'on a pas le selecteur des bibliotheques d'icone. on
 * doit recuperer toutes avec un moteur de recherche a l'interieur du
 * selecteur." Replaces the plain text input (icon field, typed from memory
 * against components/ui/icon.tsx's Lucide export name) with a searchable
 * combobox over every lucide-react icon (LUCIDE_ICON_NAMES — the full set,
 * not a curated subset).
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
  const selected = value?.trim() ?? ""
  const SelectedIcon = selected ? ICON_MAP[selected] : undefined

  // The picked value might not be a real lucide-react export (legacy typo,
  // or a lucide version bump renamed/dropped it) — surfaced explicitly
  // instead of the picker silently acting like nothing is selected.
  const isUnknown = Boolean(selected) && !SelectedIcon

  // cmdk's built-in filter/sort re-parents every <CommandItem> via
  // appendChild on each keystroke to reorder by score — with 1534 ungrouped
  // items that throws "Failed to execute 'appendChild' on 'Node': parameter
  // 1 is not of type 'Node'" (confirmed in a real production build, not a
  // dev-only Strict Mode artifact: every keystroke crashed the search
  // silently, 2026-07-10). shouldFilter={false} disables that DOM-sorting
  // path entirely; we filter (and cap) the list ourselves instead, which
  // also avoids rendering 1534 DOM nodes on every open.
  const names = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matches = q ? LUCIDE_ICON_NAMES.filter((n) => n.toLowerCase().includes(q)) : LUCIDE_ICON_NAMES
    return matches.slice(0, 150)
  }, [search])

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>Icon</Label>
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
            className="w-full justify-between font-normal"
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
                  knowing the exact Lucide name, there was no way to browse:
                  scanning ~150 unlabeled icons to find e.g. "server" or
                  "rocket" meant hovering each one individually. Icon + name
                  side by side, one per row, so the list is actually
                  scannable and the name is readable without hovering. */}
              <div className="p-1">
                {names.map((iconName) => {
                  const Icon = ICON_MAP[iconName]
                  if (!Icon) return null
                  const isSelected = selected === iconName
                  return (
                    <CommandItem
                      key={iconName}
                      value={iconName}
                      onSelect={() => {
                        onChange(iconName)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 aria-selected:bg-muted",
                        isSelected && "bg-primary/10",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
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
  )
}
