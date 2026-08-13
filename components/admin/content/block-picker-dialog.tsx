"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { AVAILABLE_BLOCK_TYPES } from "./block-editor"
import { getBlockTypeIcon, getBlockTypeLabel, getBlockTypeDescription, getBlockTypeThumbnail, BLOCK_SOURCE_LABELS } from "./block-type-meta"
import { clientLayerRegistry } from "@/lib/layers/registry-client"

/**
 * Charles (2026-07-10): "un popup exclusif pour la selection de modules
 * serai un sacré plus, le tout réparti par des onglet... avec un vrai
 * visuel." Replaces AddBlockSelect's single-click Select (immediate add,
 * icon + label only) with a Dialog: real thumbnails (reused from
 * payload-cms's own block-thumbnails, see block-type-meta.ts), a one-line
 * description per block, grouped by tab, and an explicit "Ajouter" click —
 * no accidental add from just browsing the list.
 *
 * Tabs mirror clientLayerRegistry's `source` field — global (generic,
 * reusable by any site) / neosaas (specific to the boilerplate/dashboard,
 * e.g. welcome-banner) / project (specific to this one client, none yet).
 * See Plane #50 for the classification ticket.
 */
export function BlockPickerDialog({
  onSelect,
  exclude = [],
  triggerClassName,
}: {
  onSelect: (blockType: string) => void
  exclude?: string[]
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined)
  const allTypes = AVAILABLE_BLOCK_TYPES.filter((type) => !exclude.includes(type))

  // Charles (2026-08-13): the tabs+thumbnails picker had no search at all —
  // fine for the first ~10 blocks, not for the 17+ registered today.
  // Filters on label AND description (block-type-meta.ts) so e.g. "author"
  // still surfaces "author-card" even if its label read differently.
  const normalizedQuery = query.trim().toLowerCase()
  const types = normalizedQuery
    ? allTypes.filter(
        (type) =>
          getBlockTypeLabel(type).toLowerCase().includes(normalizedQuery) ||
          (getBlockTypeDescription(type) ?? "").toLowerCase().includes(normalizedQuery),
      )
    : allTypes

  // Recomputed from the filtered set, not allTypes — a tab with zero matches
  // under the current search shouldn't render as a selectable-but-empty tab.
  const sources = (["global", "neosaas", "project"] as const).filter((source) =>
    types.some((type) => clientLayerRegistry[type].source === source),
  )
  // A search can make the previously-active tab disappear (zero matches
  // left in it) — Radix Tabs renders nothing if `value` doesn't match any
  // current TabsTrigger, so fall back to the first surviving tab instead of
  // silently going blank.
  const effectiveTab = activeTab && sources.includes(activeTab as (typeof sources)[number]) ? activeTab : sources[0]

  function handleSelect(blockType: string) {
    onSelect(blockType)
    setOpen(false)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery("")
      setActiveTab(undefined)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName ?? "w-[220px]"}>
          <Plus className="h-3.5 w-3.5" /> Add block
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose a block</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks by name or description..."
            className="pl-8"
            autoFocus
          />
        </div>
        {sources.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {normalizedQuery ? `No blocks match "${query}".` : "No blocks available."}
          </p>
        ) : (
        <Tabs value={effectiveTab} onValueChange={setActiveTab}>
          <TabsList>
            {sources.map((source) => (
              <TabsTrigger key={source} value={source}>
                {BLOCK_SOURCE_LABELS[source]}
              </TabsTrigger>
            ))}
          </TabsList>
          {sources.map((source) => {
            // Alphabetical by label — Object.keys() insertion order (the
            // previous default) had no logic to it, made the grid feel
            // random rather than something you could scan (Charles,
            // 2026-07-10: "j'ai pas l'impression que tous ces modules
            // devant nous sont vraiment bien ordonnés").
            const typesForSource = types
              .filter((type) => clientLayerRegistry[type].source === source)
              .sort((a, b) => getBlockTypeLabel(a).localeCompare(getBlockTypeLabel(b)))
            return (
              <TabsContent key={source} value={source}>
                <ScrollArea className="h-[420px] pr-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {typesForSource.map((type) => {
                      const Icon = getBlockTypeIcon(type)
                      const thumbnail = getBlockTypeThumbnail(type)
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleSelect(type)}
                          className="group flex flex-col overflow-hidden rounded-lg border text-left transition hover:border-primary hover:shadow-xs"
                        >
                          <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted">
                            {thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumbnail} alt="" className="h-full w-full object-cover object-top" />
                            ) : (
                              <>
                                <Icon className="h-8 w-8 text-muted-foreground" />
                                {/* Explicit rather than just showing a bare icon and
                                    letting it pass for "no visual planned" — Charles,
                                    2026-07-10: "certains n'ont pas de visuels" — this
                                    makes the gap visible instead of silent. */}
                                <span className="absolute bottom-1 right-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  No preview
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-start gap-2 p-3">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">{getBlockTypeLabel(type)}</p>
                              <p className="text-xs text-muted-foreground">{getBlockTypeDescription(type)}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                    {typesForSource.length === 0 && (
                      <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                        No blocks in this category yet.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            )
          })}
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
