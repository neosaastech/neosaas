"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ChevronUp, ChevronDown, Link2, Globe, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveContentFooter, getContentFooter } from "@/app/actions/header-footer"
import { getContentPages, getContentCategories } from "@/app/actions/pages"
import { MediaPickerField } from "./media-picker-field"
import { BlockEditor } from "./block-editor"
import type {
  PayloadFooterDoc,
  PayloadPageSummary,
  PayloadCategorySummary,
  PayloadPageBlock,
  FooterWriteInput,
  HeaderBrandDisplay,
} from "@/lib/payload-bridge"
import { ScopePicker, emptyScope, type ScopeFormValue } from "./scope-picker"
import { PayloadLinkEditor, emptyLink, linkValueToForm, formToLinkValue, type LinkFormValue } from "./payload-link-editor"
import { FooterPreview } from "./header-footer-preview"

// Charles (2026-07-14): "on doit modifier le form module par le choix de
// module ... il suffit d'ajouter n'importe quel module dans les colonnes
// désirées. on peut même ajouter le module colonne qui existe déjà sur
// page. enfin l'apparition de modules est optionnel." Replaces the old
// fixed `columns` (links-only) + `formModule` (single, bottom-only) Cards
// with an open, optional list of modules — Links (bespoke, footer-only,
// not part of the page-block registry), Form and Columns (both reused
// verbatim via BlockEditor, the exact same component Pages use to edit
// those block types — no reimplementation).
interface LinksModuleForm {
  blockType: "links"
  id: string
  title: string
  links: LinkFormValue[]
}
type FooterModuleForm = LinksModuleForm | PayloadPageBlock

function isLinksModule(module: FooterModuleForm): module is LinksModuleForm {
  return module.blockType === "links"
}

function moduleToForm(block: PayloadPageBlock, index: number): FooterModuleForm {
  if (block.blockType === "links") {
    const rawLinks = (block.links as { link?: unknown }[] | undefined) ?? []
    return {
      blockType: "links",
      id: (block.id as string) ?? `links-${index}`,
      title: (block.title as string) ?? "",
      links: rawLinks.map((l) => linkValueToForm(l.link as never)),
    }
  }
  return block
}

function formToModule(module: FooterModuleForm): PayloadPageBlock {
  if (isLinksModule(module)) {
    return {
      blockType: "links",
      title: module.title || undefined,
      links: module.links.map((l) => ({ link: formToLinkValue(l) })),
    }
  }
  return module
}

function footerToForm(footer?: PayloadFooterDoc): {
  scope: ScopeFormValue
  modules: FooterModuleForm[]
  brandDisplay: HeaderBrandDisplay
  logo: string
  copyrightText: string
  tagline: string
} {
  if (!footer) return { scope: emptyScope(), modules: [], brandDisplay: "inherit", logo: "", copyrightText: "", tagline: "" }
  return {
    scope: {
      scopeType: footer.scopeType,
      scopePageId: typeof footer.scopePage === "object" && footer.scopePage ? String(footer.scopePage.id) : footer.scopePage ? String(footer.scopePage) : "",
      scopeCategoryId:
        typeof footer.scopeCategory === "object" && footer.scopeCategory ? String(footer.scopeCategory.id) : footer.scopeCategory ? String(footer.scopeCategory) : "",
      scopePageType: footer.scopePageType ?? "",
    },
    modules: (footer.modules ?? []).map(moduleToForm),
    brandDisplay: footer.brandDisplay ?? "inherit",
    logo: footer.logo ?? "",
    copyrightText: footer.copyrightText ?? "",
    tagline: footer.tagline ?? "",
  }
}

export function FooterEditor({
  footer,
  locale = "fr",
  onSaved,
  onCancel,
}: {
  footer?: PayloadFooterDoc
  locale?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const initial = footerToForm(footer)
  // Same in-editor language switch as PageEditor/HeaderEditor — save the
  // current draft, then reload this same Footer's content in the other
  // language without closing the sheet (Charles, 2026-07-15).
  const [activeLocale, setActiveLocale] = useState(locale)
  const [isSwitchingLocale, setIsSwitchingLocale] = useState(false)
  const [scope, setScope] = useState<ScopeFormValue>(initial.scope)
  const [modules, setModules] = useState<FooterModuleForm[]>(initial.modules)
  const [brandDisplay, setBrandDisplay] = useState<HeaderBrandDisplay>(initial.brandDisplay)
  const [logo, setLogo] = useState(initial.logo)
  const [copyrightText, setCopyrightText] = useState(initial.copyrightText)
  const [tagline, setTagline] = useState(initial.tagline)
  const [pages, setPages] = useState<PayloadPageSummary[]>([])
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [saving, setSaving] = useState(false)
  // handleSave previously read `footer?.id ?? null` directly — fine for a
  // single save, but a locale switch needs to know the id of a footer
  // created *during this same editing session* (footer prop is frozen from
  // when the sheet opened), so this now tracks it across saves.
  const docIdRef = useRef<string | number | null>(footer?.id ?? null)

  useEffect(() => {
    getContentPages({ limit: 200 }).then((r) => r.success && setPages(r.data.docs))
    getContentCategories().then((r) => r.success && setCategories(r.data))
  }, [])

  function applyDoc(doc: PayloadFooterDoc) {
    const form = footerToForm(doc)
    setScope(form.scope)
    setModules(form.modules)
    setBrandDisplay(form.brandDisplay)
    setLogo(form.logo)
    setCopyrightText(form.copyrightText)
    setTagline(form.tagline)
  }

  async function persist(): Promise<PayloadFooterDoc> {
    const input: FooterWriteInput = {
      scopeType: scope.scopeType,
      scopePage: scope.scopeType === "page" ? scope.scopePageId || null : null,
      scopeCategory: scope.scopeType === "category" ? scope.scopeCategoryId || null : null,
      scopePageType: scope.scopeType === "pageType" ? scope.scopePageType || null : null,
      modules: modules.map(formToModule),
      brandDisplay,
      logo: logo || null,
      copyrightText: copyrightText || null,
      tagline: tagline || null,
    }
    const result = await saveContentFooter(docIdRef.current, input, activeLocale)
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
    setIsSwitchingLocale(true)
    try {
      await persist()
      const result = await getContentFooter(docIdRef.current, nextLocale)
      if (!result.success) throw new Error(result.error)
      applyDoc(result.data)
      setActiveLocale(nextLocale)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch language")
    } finally {
      setIsSwitchingLocale(false)
    }
  }

  function addModule(blockType: "links" | "form" | "columns") {
    if (blockType === "links") {
      setModules((prev) => [...prev, { blockType: "links", id: `links-${Date.now()}`, title: "", links: [] }])
    } else if (blockType === "form") {
      setModules((prev) => [...prev, { blockType: "form", name: "", items: [] }])
    } else {
      setModules((prev) => [...prev, { blockType: "columns", columnCount: "2", columns: [] }])
    }
  }
  function updateModule(index: number, next: FooterModuleForm) {
    setModules((prev) => prev.map((m, i) => (i === index ? next : m)))
  }
  function removeModule(index: number) {
    setModules((prev) => prev.filter((_, i) => i !== index))
  }
  function moveModule(index: number, direction: -1 | 1) {
    setModules((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await persist()
      toast.success("Footer saved")
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save footer")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="col-span-full flex items-center justify-end gap-2">
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
      <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <ScopePicker value={scope} onChange={setScope} pages={pages} categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Modules</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => addModule("links")}>
              <Plus className="h-4 w-4 mr-1" /> Links
            </Button>
            <Button variant="outline" size="sm" onClick={() => addModule("form")}>
              <Plus className="h-4 w-4 mr-1" /> Form
            </Button>
            <Button variant="outline" size="sm" onClick={() => addModule("columns")}>
              <Plus className="h-4 w-4 mr-1" /> Columns
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {modules.map((module, index) =>
            isLinksModule(module) ? (
              <div key={module.id} className="rounded-lg border-l-4 border-l-brand p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="gap-1.5">
                    <Link2 className="h-3.5 w-3.5" /> Links
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => moveModule(index, -1)}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={index === modules.length - 1} onClick={() => moveModule(index, 1)}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeModule(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Input
                  placeholder="Column title (optional)"
                  value={module.title}
                  onChange={(e) => updateModule(index, { ...module, title: e.target.value })}
                />
                <div className="pl-4 space-y-2 border-l">
                  {module.links.map((link, linkIndex) => (
                    <div key={linkIndex} className="flex items-start gap-2">
                      <div className="flex-1">
                        <PayloadLinkEditor
                          value={link}
                          onChange={(l) => updateModule(index, { ...module, links: module.links.map((li, lidx) => (lidx === linkIndex ? l : li)) })}
                          pages={pages}
                          categories={categories}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateModule(index, { ...module, links: module.links.filter((_, li) => li !== linkIndex) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => updateModule(index, { ...module, links: [...module.links, emptyLink()] })}>
                    <Plus className="h-3 w-3 mr-1" /> Link
                  </Button>
                </div>
              </div>
            ) : (
              <BlockEditor
                key={(module.id as string) ?? index}
                block={module}
                onChange={(next) => updateModule(index, next)}
                onRemove={() => removeModule(index)}
                onMoveUp={() => moveModule(index, -1)}
                onMoveDown={() => moveModule(index, 1)}
                canMoveUp={index > 0}
                canMoveDown={index < modules.length - 1}
              />
            ),
          )}
          {modules.length === 0 && <p className="text-sm text-muted-foreground">No modules yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Brand (logo / site name)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Display</Label>
              <Select value={brandDisplay} onValueChange={(v) => setBrandDisplay(v as HeaderBrandDisplay)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Inherit from site (default)</SelectItem>
                  <SelectItem value="logo">Logo only</SelectItem>
                  <SelectItem value="siteName">Site name only</SelectItem>
                  <SelectItem value="both">Logo + name</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(brandDisplay === "logo" || brandDisplay === "both") && (
            <div>
              <Label className="text-xs">Footer logo (falls back to the site&apos;s)</Label>
              <MediaPickerField name="logo" kind="image" value={logo} onChange={setLogo} />
            </div>
          )}
          <div>
            <Label className="text-xs">Tagline (under the logo)</Label>
            <Textarea
              placeholder="Leave empty to keep the site's default text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Copyright</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Leave empty to keep the site's default text"
            value={copyrightText}
            onChange={(e) => setCopyrightText(e.target.value)}
          />
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

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Live preview</h3>
        <FooterPreview
          modules={modules.map(formToModule)}
          brandDisplay={brandDisplay}
          logo={logo}
          copyrightText={copyrightText}
          tagline={tagline}
          pages={pages}
          categories={categories}
        />
      </div>
    </div>
  )
}
