"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Upload, Link2, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { FontSource } from "@/types/theme-config"
import { GOOGLE_FONTS } from "@/lib/theme/google-fonts"

interface FontSourcePickerProps {
  label: string
  role: "heading" | "body"
  value: FontSource | undefined
  onChange: (source: FontSource) => void
  /**
   * The font-family currently applied (theme.typography.fontFamily/fontFamilyHeading).
   * Distinct from `value`: a quick preset (Inter, Poppins+Inter...) sets this without
   * going through a FontSource at all, so the preview must reflect the theme's actual
   * active font, not just this picker's own google/upload/link selection.
   */
  activeFontFamily: string
}

export function FontSourcePicker({ label, role, value, onChange, activeFontFamily }: FontSourcePickerProps) {
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [customFamily, setCustomFamily] = useState("")
  const [linkUrl, setLinkUrl] = useState(value?.type === "link" ? value.value : "")

  const activeTab = value?.type ?? "system"

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      toast.error("Font file too large (max 500KB)")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      onChange({ type: "upload", value: reader.result as string, label: file.name })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          if (tab === "system") onChange({ type: "system", value: "" })
        }}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="google">Google Fonts</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="link">Link</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="pt-2">
          <p className="text-xs text-muted-foreground">Default system font stack — no download, fastest.</p>
        </TabsContent>

        <TabsContent value="google" className="pt-2 space-y-2">
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
                {value?.type === "google" && value.value ? value.value : "Search Google Fonts..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search a font family..." />
                <CommandList>
                  <CommandEmpty>No font found.</CommandEmpty>
                  <CommandGroup>
                    {GOOGLE_FONTS.map((font) => (
                      <CommandItem
                        key={font.family}
                        value={font.family}
                        onSelect={() => {
                          onChange({ type: "google", value: font.family, label: font.family })
                          setComboboxOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value?.type === "google" && value.value === font.family ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {font.family}
                        <span className="ml-auto text-xs text-muted-foreground">{font.category}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <div className="flex gap-2">
            <Input
              placeholder="Or type any Google Fonts family name..."
              value={customFamily}
              onChange={(e) => setCustomFamily(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!customFamily.trim()}
              onClick={() => {
                onChange({ type: "google", value: customFamily.trim(), label: customFamily.trim() })
                setCustomFamily("")
              }}
            >
              <Type className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The curated list above covers common families — any valid Google Fonts name works via the text field.
          </p>
        </TabsContent>

        <TabsContent value="upload" className="pt-2 space-y-2">
          <Input type="file" accept=".woff2,.woff,.ttf,.otf" onChange={handleFileUpload} className="cursor-pointer" />
          {value?.type === "upload" && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Upload className="h-3 w-3" /> {value.label || "Custom font uploaded"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">.woff2, .woff, .ttf or .otf — max 500KB.</p>
        </TabsContent>

        <TabsContent value="link" className="pt-2 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://.../font.woff2"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!linkUrl.trim()}
              onClick={() => onChange({ type: "link", value: linkUrl.trim(), label: linkUrl.trim() })}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Direct URL to a .woff2/.woff/.ttf font file (self-hosted, Adobe Fonts CDN, etc.).</p>
        </TabsContent>
      </Tabs>

      <p
        className="text-lg pt-1"
        style={{ fontFamily: activeFontFamily }}
      >
        {role === "heading" ? "Heading preview — Aa" : "Body text preview — the quick brown fox"}
      </p>
    </div>
  )
}
