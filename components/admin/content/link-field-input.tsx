"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getContentPages, getContentArticles, getContentMedia } from "@/app/actions/pages"

export interface LinkOption {
  value: string
  label: string
}

// Fetched once per admin session, same lifetime/cache pattern as
// `cachedOptions` below — PDFs (and any other non-image/video upload)
// eligible as link targets. Filtered to non-image/video mimetypes rather
// than `application/pdf` only, so any future document type (docx, xlsx...)
// shows up here without another code change.
let cachedDocumentOptions: LinkOption[] | null = null

export async function loadDocumentLinkOptions(): Promise<LinkOption[]> {
  if (cachedDocumentOptions) return cachedDocumentOptions
  const result = await getContentMedia({ limit: 200 })
  if (!result.success) return []
  const options = result.data
    .filter((m) => {
      const mime = m.mimeType ?? ""
      return !mime.startsWith("image/") && !mime.startsWith("video/")
    })
    .map((m) => ({ value: m.url, label: m.alt ? `${m.filename} — ${m.alt}` : m.filename }))
  cachedDocumentOptions = options
  return options
}

// Charles (2026-07-09): "des pages de type automatique comme rgpd et
// produits" — /pricing and /legal/* are real, linkable pages but aren't
// driven by Payload's page_layers table (hardcoded business/payment logic,
// see pages-settings.tsx's own "stay hardcoded" note) so they never show up
// in getContentPages(). Listed here by hand since there's no collection to
// query them from — locale-agnostic paths, same convention as Payload
// pages' own `path` (locale prefix is added at render time, not stored).
const HARDCODED_PAGES: LinkOption[] = [
  { value: "/pricing", label: "Pricing — /pricing" },
  { value: "/legal/privacy", label: "Privacy policy — /legal/privacy" },
  { value: "/legal/terms", label: "Terms of service — /legal/terms" },
]

// Fetched once per admin session (module-level cache) — the picker is
// mounted per href field, and a page's own list of pages/articles doesn't
// change mid-edit. Cleared on full reload, same lifetime as a page refresh.
let cachedOptions: LinkOption[] | null = null

export async function loadLinkOptions(): Promise<LinkOption[]> {
  if (cachedOptions) return cachedOptions
  const [pagesResult, articlesResult] = await Promise.all([
    getContentPages({ limit: 200 }),
    getContentArticles({ limit: 200 }),
  ])
  const options: LinkOption[] = [...HARDCODED_PAGES]
  if (pagesResult.success) {
    for (const p of pagesResult.data.docs) {
      if (p._status === "published") options.push({ value: p.path, label: `${p.title} — ${p.path}` })
    }
  }
  if (articlesResult.success) {
    for (const a of articlesResult.data.docs) {
      if (a._status === "published") options.push({ value: `/blog/${a.slug}`, label: `${a.title} — /blog/${a.slug}` })
    }
  }
  cachedOptions = options
  return options
}

/**
 * Charles (2026-07-09): "comme sur payload. on doit retrouver les listes de
 * pages existantes pour créer des liens." Payload's linkField() (shared by
 * hero/hero-split/cta-banner/welcome-banner) offers type="reference"|
 * "custom" with a real relationship picker to Pages/BlogPosts. This is that
 * same choice reimplemented for neosaas-v2's own generic Zod-driven form
 * builder (dynamic-field.tsx), which previously rendered any *Href field as
 * a bare text input — a typo or a renamed page produced a silent dead link,
 * never caught.
 */
/**
 * Charles (2026-07-09): "tout les selecteur de liens sont accompagné d'un
 * moteur de recherche" — instant text/fuzzy search over already-loaded
 * options (no embeddings), same Popover+Command combobox pattern already
 * used by font-source-picker.tsx. Shared between the "page" and "document"
 * modes below — they only differ in which options they list.
 */
function LinkCombobox({
  id,
  value,
  options,
  loaded,
  loadingLabel,
  placeholderLabel,
  searchPlaceholder,
  emptyLabel,
  onSelect,
  onClear,
}: {
  id: string
  value: string
  options: LinkOption[]
  loaded: boolean
  loadingLabel: string
  placeholderLabel: string
  searchPlaceholder: string
  emptyLabel: string
  onSelect: (value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const matches = options.some((o) => o.value === value)

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className="truncate">
              {matches ? options.find((o) => o.value === value)?.label : loaded ? placeholderLabel : loadingLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => {
                      onSelect(o.value)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        // Charles (2026-07-09): "impossible de le supprimer sans tout
        // couper" — clearing previously meant switching to Custom URL mode
        // and manually erasing the text, which didn't reliably reset the
        // underlying value. This resets `value` directly, in place.
        <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" aria-label="Clear selected link" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export function LinkFieldInput({ name, value, onChange }: { name: string; value: string; onChange: (next: string) => void }) {
  const [options, setOptions] = useState<LinkOption[]>([])
  const [documentOptions, setDocumentOptions] = useState<LinkOption[]>([])
  const [loaded, setLoaded] = useState(false)
  const [documentsLoaded, setDocumentsLoaded] = useState(false)
  const matchesExistingPage = options.some((o) => o.value === value)
  const matchesExistingDocument = documentOptions.some((o) => o.value === value)
  const [mode, setMode] = useState<"page" | "document" | "custom">(
    value && matchesExistingDocument ? "document" : value && !matchesExistingPage ? "custom" : "page",
  )

  useEffect(() => {
    loadLinkOptions().then((opts) => {
      setOptions(opts)
      setLoaded(true)
    })
    // PDFs (and any other non-image/video upload) as link targets — Charles
    // (2026-07-11): "notre module d'édition va devoir intégrer cette
    // gestion dans ses commandes notamment les liens des PDF." Loaded
    // alongside pages/articles rather than lazily on tab-switch — this
    // field is used across dozens of blocks, a second network round-trip
    // on first click of "Document" would be a worse default than paying
    // the (small, cached) cost once up front like the page options already do.
    loadDocumentLinkOptions().then((opts) => {
      setDocumentOptions(opts)
      setDocumentsLoaded(true)
    })
  }, [])

  // Once options arrive, re-check whether the current value is a known page
  // or document (covers the case where the field already had a value before
  // options finished loading).
  useEffect(() => {
    if (!loaded || !value) return
    if (options.some((o) => o.value === value)) setMode("page")
  }, [loaded, options, value])

  useEffect(() => {
    if (!documentsLoaded || !value) return
    if (documentOptions.some((o) => o.value === value)) setMode("document")
  }, [documentsLoaded, documentOptions, value])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={name}>{name}</Label>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant={mode === "page" ? "secondary" : "ghost"} className="h-6 px-2 text-xs" onClick={() => setMode("page")}>
            Existing page
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "document" ? "secondary" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => setMode("document")}
          >
            Document
          </Button>
          <Button type="button" size="sm" variant={mode === "custom" ? "secondary" : "ghost"} className="h-6 px-2 text-xs" onClick={() => setMode("custom")}>
            Custom URL
          </Button>
        </div>
      </div>
      {mode === "page" ? (
        <LinkCombobox
          id={name}
          value={value}
          options={options}
          loaded={loaded}
          loadingLabel="Loading pages..."
          placeholderLabel="Select a page..."
          searchPlaceholder="Search by title or path..."
          emptyLabel="No page found."
          onSelect={onChange}
          onClear={() => onChange("")}
        />
      ) : mode === "document" ? (
        <LinkCombobox
          id={name}
          value={value}
          options={documentOptions}
          loaded={documentsLoaded}
          loadingLabel="Loading documents..."
          placeholderLabel={documentOptions.length === 0 ? "No document uploaded yet" : "Select a document..."}
          searchPlaceholder="Search by filename..."
          emptyLabel="No document found — upload a PDF in the Media tab first."
          onSelect={onChange}
          onClear={() => onChange("")}
        />
      ) : (
        <Input id={name} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https:// or /path" />
      )}
    </div>
  )
}
