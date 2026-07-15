"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveContentModule, getContentModule } from "@/app/actions/header-footer"
import { getContentPages, getContentCategories } from "@/app/actions/pages"
import { BlockEditor } from "./block-editor"
import { BlockPickerDialog } from "./block-picker-dialog"
import type { PayloadModuleDoc, PayloadPageSummary, PayloadCategorySummary, PayloadPageBlock, ModuleWriteInput } from "@/lib/payload-bridge"
import { ScopePicker, emptyScope, type ScopeFormValue } from "./scope-picker"

/**
 * Charles (2026-07-14): reusable content injected at a specific position
 * inside a page via a `module-anchor` block — same scope picker as Header/
 * Footer, plus `anchorKey` (must match an anchor's key to ever render) and
 * `content`, which reuses the exact same block-editing components
 * (BlockEditor/BlockPickerDialog) Pages already use for `layout` — no
 * separate, narrower editor for Modules' content, "toute la bibliothèque
 * de blocs existante" per the brief.
 */
export function ModuleEditor({
  module,
  locale = "fr",
  onSaved,
  onCancel,
}: {
  module?: PayloadModuleDoc
  locale?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [scope, setScope] = useState<ScopeFormValue>(
    module
      ? {
          scopeType: module.scopeType,
          scopePageId: typeof module.scopePage === "object" && module.scopePage ? String(module.scopePage.id) : module.scopePage ? String(module.scopePage) : "",
          scopeCategoryId:
            typeof module.scopeCategory === "object" && module.scopeCategory ? String(module.scopeCategory.id) : module.scopeCategory ? String(module.scopeCategory) : "",
          scopePageType: module.scopePageType ?? "",
        }
      : emptyScope(),
  )
  const [anchorKey, setAnchorKey] = useState(module?.anchorKey ?? "")
  const [content, setContent] = useState<PayloadPageBlock[]>(module?.content ?? [])
  const [pages, setPages] = useState<PayloadPageSummary[]>([])
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [saving, setSaving] = useState(false)
  // Same in-editor language switch as PageEditor/HeaderEditor/FooterEditor —
  // save the current draft, then reload this same Module's content in the
  // other language without closing the sheet (Charles, 2026-07-15).
  const [activeLocale, setActiveLocale] = useState(locale)
  const [isSwitchingLocale, setIsSwitchingLocale] = useState(false)
  const docIdRef = useRef<string | number | null>(module?.id ?? null)

  useEffect(() => {
    getContentPages({ limit: 200 }).then((r) => r.success && setPages(r.data.docs))
    getContentCategories().then((r) => r.success && setCategories(r.data))
  }, [])

  function applyDoc(doc: PayloadModuleDoc) {
    setScope({
      scopeType: doc.scopeType,
      scopePageId: typeof doc.scopePage === "object" && doc.scopePage ? String(doc.scopePage.id) : doc.scopePage ? String(doc.scopePage) : "",
      scopeCategoryId:
        typeof doc.scopeCategory === "object" && doc.scopeCategory ? String(doc.scopeCategory.id) : doc.scopeCategory ? String(doc.scopeCategory) : "",
      scopePageType: doc.scopePageType ?? "",
    })
    setAnchorKey(doc.anchorKey ?? "")
    setContent(doc.content ?? [])
  }

  async function persist(): Promise<PayloadModuleDoc> {
    const sanitizedContent = JSON.parse(JSON.stringify(content))
    const input: ModuleWriteInput = {
      scopeType: scope.scopeType,
      scopePage: scope.scopeType === "page" ? scope.scopePageId || null : null,
      scopeCategory: scope.scopeType === "category" ? scope.scopeCategoryId || null : null,
      scopePageType: scope.scopeType === "pageType" ? scope.scopePageType || null : null,
      anchorKey: anchorKey.trim(),
      content: sanitizedContent,
    }
    const result = await saveContentModule(docIdRef.current, input, activeLocale)
    if (!result.success) throw new Error(result.error)
    docIdRef.current = result.data.id
    return result.data
  }

  async function handleLocaleChange(nextLocale: string) {
    if (nextLocale === activeLocale || isSwitchingLocale) return
    if (!docIdRef.current) {
      setActiveLocale(nextLocale)
      return
    }
    if (!anchorKey.trim()) {
      toast.error("Anchor key is required before switching language")
      return
    }
    setIsSwitchingLocale(true)
    try {
      await persist()
      const result = await getContentModule(docIdRef.current, nextLocale)
      if (!result.success) throw new Error(result.error)
      applyDoc(result.data)
      setActiveLocale(nextLocale)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch language")
    } finally {
      setIsSwitchingLocale(false)
    }
  }

  function addBlock(blockType: string) {
    setContent([...content, { blockType }])
  }
  function updateBlock(index: number, next: PayloadPageBlock) {
    setContent(content.map((b, i) => (i === index ? next : b)))
  }
  function removeBlock(index: number) {
    setContent(content.filter((_, i) => i !== index))
  }
  function moveBlock(index: number, direction: -1 | 1) {
    const next = [...content]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setContent(next)
  }

  async function handleSave() {
    if (!anchorKey.trim()) {
      toast.error("Anchor key is required")
      return
    }
    setSaving(true)
    try {
      await persist()
      toast.success("Module saved")
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save module")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {isSwitchingLocale && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        <Select value={activeLocale} onValueChange={handleLocaleChange} disabled={isSwitchingLocale}>
          <SelectTrigger className="h-8 w-[150px] gap-1">
            <Globe className="h-3 w-3 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">🇫🇷 Français</SelectItem>
            <SelectItem value="en">🇬🇧 English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <ScopePicker value={scope} onChange={setScope} pages={pages} categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Anchor key</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-xs">anchorKey</Label>
          <Input
            value={anchorKey}
            onChange={(e) => setAnchorKey(e.target.value)}
            placeholder="e.g. promo-top, newsletter-cta"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Must exactly match the anchorKey of a &quot;Module anchor&quot; block placed on the concerned page(s).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Content</CardTitle>
          <BlockPickerDialog onSelect={addBlock} />
        </CardHeader>
        <CardContent className="space-y-4">
          {content.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocks yet.</p>
          ) : (
            content.map((block, index) => (
              <BlockEditor
                key={index}
                block={block}
                onChange={(next) => updateBlock(index, next)}
                onRemove={() => removeBlock(index)}
                onMoveUp={() => moveBlock(index, -1)}
                onMoveDown={() => moveBlock(index, 1)}
                canMoveUp={index > 0}
                canMoveDown={index < content.length - 1}
              />
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}
