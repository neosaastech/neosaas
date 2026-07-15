"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, ImageOff, Loader2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getContentMedia, uploadContentMedia } from "@/app/actions/pages"
import type { PayloadMediaSummary } from "@/lib/payload-bridge"

// Fetched once per admin session (module-level cache) — same lifetime
// convention as link-field-input.tsx's loadLinkOptions.
let cachedMedia: PayloadMediaSummary[] | null = null

async function loadMediaOptions(): Promise<PayloadMediaSummary[]> {
  if (cachedMedia) return cachedMedia
  const result = await getContentMedia({ limit: 100 })
  cachedMedia = result.success ? result.data : []
  return cachedMedia
}

/**
 * Charles (2026-07-09): "on a pas mal d'endroit à traiter dans cet api pour
 * les media où on a qu'un simple champs url. et on doit avoir une vignette
 * preview depuis chaque champs media." Same Popover+Command combobox
 * pattern as LinkFieldInput, searching Payload's Media collection
 * (filename/alt) instead of pages. `kind` narrows the list to images or
 * videos by mimeType and picks the right preview tag — imageUrl and
 * videoUrl fields both route here (dynamic-field.tsx).
 */
export function MediaPickerField({
  name,
  kind,
  value,
  onChange,
}: {
  name: string
  kind: "image" | "video"
  value: string
  onChange: (next: string) => void
}) {
  const [options, setOptions] = useState<PayloadMediaSummary[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMediaOptions().then((opts) => {
      setOptions(opts.filter((m) => (m.mimeType ?? "").startsWith(`${kind}/`)))
      setLoaded(true)
    })
  }, [kind])

  const current = options.find((m) => m.url === value)

  // Charles (2026-07-15): "on ne peut ajouter directement une image depuis
  // l'éditeur de page" — this picker only ever let you choose FROM the
  // media library (getContentMedia), never add TO it; uploading meant
  // leaving the page editor for the separate Media admin page, then coming
  // back to pick the result. uploadContentMedia (app/actions/pages.ts) was
  // already wired for the Media library page itself — this is the same
  // action, just reachable from right here too.
  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadContentMedia(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      cachedMedia = [result.data, ...(cachedMedia ?? [])]
      if ((result.data.mimeType ?? "").startsWith(`${kind}/`)) {
        setOptions((prev) => [result.data, ...prev])
      }
      onChange(result.data.url)
      setOpen(false)
      toast.success("Media uploaded")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload media")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{name}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={name}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {current ? current.filename : loaded ? "Select media..." : "Loading media..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by filename or alt..." />
            <div className="border-b p-1">
              <input
                ref={fileInputRef}
                type="file"
                accept={kind === "image" ? "image/*" : "video/*"}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ""
                  if (file) void handleUpload(file)
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : `Upload a new ${kind}...`}
              </Button>
            </div>
            <CommandList>
              <CommandEmpty>No {kind} found in the media library.</CommandEmpty>
              <CommandGroup>
                {options.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.filename} ${m.alt ?? ""}`}
                    onSelect={() => {
                      onChange(m.url)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", value === m.url ? "opacity-100" : "opacity-0")} />
                    {kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" className="mr-2 h-6 w-6 shrink-0 rounded object-cover" />
                    ) : (
                      <video src={m.url} className="mr-2 h-6 w-6 shrink-0 rounded object-cover" muted />
                    )}
                    <span className="truncate">{m.filename}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https:// or /path (custom URL)"
        className="text-xs"
      />
      {value ? (
        kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-24 w-24 rounded-md border object-cover" />
        ) : (
          <video src={value} className="h-24 w-40 rounded-md border object-cover" muted controls />
        )
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <ImageOff className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}
