"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { saveContentHeader, getContentHeader } from "@/app/actions/header-footer"
import { getContentPages, getContentCategories } from "@/app/actions/pages"
import { MediaPickerField } from "./media-picker-field"
import { IconPickerField } from "./icon-picker-field"
import { useAutosave } from "./use-autosave"
import type {
  PayloadHeaderDoc,
  PayloadPageSummary,
  PayloadCategorySummary,
  HeaderWriteInput,
  HeaderBrandDisplay,
  PayloadSocialLink,
} from "@/lib/payload-bridge"
import { ScopePicker, emptyScope, type ScopeFormValue } from "./scope-picker"
import { PayloadLinkEditor, emptyLink, linkValueToForm, formToLinkValue, type LinkFormValue } from "./payload-link-editor"
import { HeaderPreview } from "./header-footer-preview"

interface NavItemForm {
  link: LinkFormValue
  children: LinkFormValue[]
}

interface HeaderForm {
  scope: ScopeFormValue
  navItems: NavItemForm[]
  cta: LinkFormValue
  showCta: boolean
  brandDisplay: HeaderBrandDisplay
  logo: string
  showThemeSwitch: boolean
  showLocaleSwitcher: boolean
  showSocialLinks: boolean
  showAuthButtons: boolean
  socialLinks: PayloadSocialLink[]
}

function headerToForm(header?: PayloadHeaderDoc): HeaderForm {
  if (!header) {
    return {
      scope: emptyScope(),
      navItems: [],
      cta: emptyLink(),
      showCta: false,
      brandDisplay: "inherit",
      logo: "",
      showThemeSwitch: true,
      showLocaleSwitcher: true,
      showSocialLinks: true,
      showAuthButtons: true,
      socialLinks: [],
    }
  }
  const cta = linkValueToForm(header.cta)
  return {
    scope: {
      scopeType: header.scopeType,
      scopePageId: typeof header.scopePage === "object" && header.scopePage ? String(header.scopePage.id) : header.scopePage ? String(header.scopePage) : "",
      scopeCategoryId:
        typeof header.scopeCategory === "object" && header.scopeCategory ? String(header.scopeCategory.id) : header.scopeCategory ? String(header.scopeCategory) : "",
      scopePageType: header.scopePageType ?? "",
    },
    navItems: (header.navItems ?? []).map((item) => ({
      link: linkValueToForm(item.link),
      children: (item.children ?? []).map((c) => linkValueToForm(c.link)),
    })),
    cta,
    showCta: Boolean(cta.label || cta.url || cta.referenceId),
    brandDisplay: header.brandDisplay ?? "inherit",
    logo: header.logo ?? "",
    showThemeSwitch: header.showThemeSwitch !== false,
    showLocaleSwitcher: header.showLocaleSwitcher !== false,
    showSocialLinks: header.showSocialLinks !== false,
    showAuthButtons: header.showAuthButtons !== false,
    socialLinks: header.socialLinks ?? [],
  }
}

export function HeaderEditor({
  header,
  locale = "fr",
  onSaved,
  onCancel,
}: {
  header?: PayloadHeaderDoc
  locale?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const initial = headerToForm(header)
  // Same in-editor language switch as PageEditor — autosave the current
  // draft, then reload this same Header's content in the other language
  // without closing the sheet (Charles, 2026-07-15).
  const [activeLocale, setActiveLocale] = useState(locale)
  const [isSwitchingLocale, setIsSwitchingLocale] = useState(false)
  const [scope, setScope] = useState<ScopeFormValue>(initial.scope)
  const [navItems, setNavItems] = useState<NavItemForm[]>(initial.navItems)
  const [cta, setCta] = useState<LinkFormValue>(initial.cta)
  const [showCta, setShowCta] = useState(initial.showCta)
  const [brandDisplay, setBrandDisplay] = useState<HeaderBrandDisplay>(initial.brandDisplay)
  const [logo, setLogo] = useState(initial.logo)
  const [showThemeSwitch, setShowThemeSwitch] = useState(initial.showThemeSwitch)
  const [showLocaleSwitcher, setShowLocaleSwitcher] = useState(initial.showLocaleSwitcher)
  const [showSocialLinks, setShowSocialLinks] = useState(initial.showSocialLinks)
  const [showAuthButtons, setShowAuthButtons] = useState(initial.showAuthButtons)
  const [socialLinks, setSocialLinks] = useState<PayloadSocialLink[]>(initial.socialLinks)
  const [pages, setPages] = useState<PayloadPageSummary[]>([])
  const [categories, setCategories] = useState<PayloadCategorySummary[]>([])
  const [isPublishing, setIsPublishing] = useState(false)

  // Charles (2026-07-14): "on ne doit pas avoir d'enregistrement mais une
  // publication, comme sur l'admin des pages" — same docIdRef/_status
  // pattern as page-editor.tsx's persist(): autosave writes drafts
  // silently in the background, Publish is the only explicit action.
  const docIdRef = useRef<string | number | null>(header?.id ?? null)
  const [docStatus, setDocStatus] = useState(header?._status)

  useEffect(() => {
    getContentPages({ limit: 200 }).then((r) => r.success && setPages(r.data.docs))
    getContentCategories().then((r) => r.success && setCategories(r.data))
  }, [])

  function applyDoc(doc: PayloadHeaderDoc) {
    const form = headerToForm(doc)
    setScope(form.scope)
    setNavItems(form.navItems)
    setCta(form.cta)
    setShowCta(form.showCta)
    setBrandDisplay(form.brandDisplay)
    setLogo(form.logo)
    setShowThemeSwitch(form.showThemeSwitch)
    setShowLocaleSwitcher(form.showLocaleSwitcher)
    setShowSocialLinks(form.showSocialLinks)
    setShowAuthButtons(form.showAuthButtons)
    setSocialLinks(form.socialLinks)
    setDocStatus(doc._status)
  }

  async function handleLocaleChange(nextLocale: string) {
    if (nextLocale === activeLocale || isSwitchingLocale) return
    if (!docIdRef.current) {
      setActiveLocale(nextLocale)
      return
    }
    setIsSwitchingLocale(true)
    try {
      await persist("draft", formValues)
      const result = await getContentHeader(docIdRef.current, nextLocale)
      if (!result.success) throw new Error(result.error)
      applyDoc(result.data)
      setActiveLocale(nextLocale)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch language")
    } finally {
      setIsSwitchingLocale(false)
    }
  }

  function addNavItem() {
    setNavItems((prev) => [...prev, { link: emptyLink(), children: [] }])
  }
  function removeNavItem(index: number) {
    setNavItems((prev) => prev.filter((_, i) => i !== index))
  }
  function addChild(index: number) {
    setNavItems((prev) => prev.map((item, i) => (i === index ? { ...item, children: [...item.children, emptyLink()] } : item)))
  }
  function removeChild(index: number, childIndex: number) {
    setNavItems((prev) => prev.map((item, i) => (i === index ? { ...item, children: item.children.filter((_, ci) => ci !== childIndex) } : item)))
  }

  function addSocial() {
    setSocialLinks((prev) => [...prev, { icon: "", url: "" }])
  }
  function removeSocial(index: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const formValues: HeaderForm = {
    scope,
    navItems,
    cta,
    showCta,
    brandDisplay,
    logo,
    showThemeSwitch,
    showLocaleSwitcher,
    showSocialLinks,
    showAuthButtons,
    socialLinks,
  }

  async function persist(status: "draft" | "published", values: HeaderForm): Promise<PayloadHeaderDoc> {
    const input: HeaderWriteInput = {
      scopeType: values.scope.scopeType,
      scopePage: values.scope.scopeType === "page" ? values.scope.scopePageId || null : null,
      scopeCategory: values.scope.scopeType === "category" ? values.scope.scopeCategoryId || null : null,
      scopePageType: values.scope.scopeType === "pageType" ? values.scope.scopePageType || null : null,
      navItems: values.navItems.map((item) => ({
        link: formToLinkValue(item.link),
        children: item.children.length ? item.children.map((c) => ({ link: formToLinkValue(c) })) : undefined,
      })),
      // showCta off = no CTA at all, even if the fields still hold data from
      // a previous "on" state (Charles, 2026-07-14: "si fermé alors rien") —
      // an empty link value, never a bare `null` for the whole group: Payload
      // crashes ("Cannot read properties of null (reading 'reference')")
      // walking a null group field's relationships once versions.drafts is
      // enabled, found live 2026-07-14 while testing the Publish flow.
      cta: formToLinkValue(values.showCta ? values.cta : emptyLink()),
      brandDisplay: values.brandDisplay,
      logo: values.logo || null,
      showThemeSwitch: values.showThemeSwitch,
      showLocaleSwitcher: values.showLocaleSwitcher,
      showSocialLinks: values.showSocialLinks,
      showAuthButtons: values.showAuthButtons,
      socialLinks: values.socialLinks.filter((s) => s.icon && s.url),
      _status: status,
    }
    const result = await saveContentHeader(docIdRef.current, input, activeLocale)
    if (!result.success) throw new Error(result.error)
    docIdRef.current = result.data.id
    setDocStatus(result.data._status)
    return result.data
  }

  const autosave = useAutosave(formValues, (values) => persist("draft", values).then(() => undefined))

  async function handlePublish() {
    setIsPublishing(true)
    try {
      await persist("published", formValues)
      toast.success("Header published")
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Live preview</h3>
        <HeaderPreview
          navItems={navItems}
          cta={showCta ? cta : emptyLink()}
          brandDisplay={brandDisplay}
          logo={logo}
          showThemeSwitch={showThemeSwitch}
          showLocaleSwitcher={showLocaleSwitcher}
          showSocialLinks={showSocialLinks}
          showAuthButtons={showAuthButtons}
          socialLinks={socialLinks}
          pages={pages}
          categories={categories}
        />
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Navigation links</CardTitle>
            <Button variant="outline" size="sm" onClick={addNavItem}>
              <Plus className="h-4 w-4 mr-1" /> Add a link
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {navItems.map((item, index) => (
              <div key={index} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <PayloadLinkEditor
                      value={item.link}
                      onChange={(link) => setNavItems((prev) => prev.map((it, i) => (i === index ? { ...it, link } : it)))}
                      pages={pages}
                      categories={categories}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeNavItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="pl-4 space-y-2 border-l">
                  {item.children.map((child, childIndex) => (
                    <div key={childIndex} className="flex items-start gap-2">
                      <div className="flex-1">
                        <PayloadLinkEditor
                          value={child}
                          onChange={(link) =>
                            setNavItems((prev) => prev.map((it, i) => (i === index ? { ...it, children: it.children.map((c, ci) => (ci === childIndex ? link : c)) } : it)))
                          }
                          pages={pages}
                          categories={categories}
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeChild(index, childIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addChild(index)}>
                    <Plus className="h-3 w-3 mr-1" /> Sub-link (dropdown menu)
                  </Button>
                </div>
              </div>
            ))}
            {navItems.length === 0 && <p className="text-sm text-muted-foreground">No links yet.</p>}
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
                <Label className="text-xs">Header logo (falls back to the site&apos;s)</Label>
                <MediaPickerField name="logo" kind="image" value={logo} onChange={setLogo} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Interface elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Light/dark switch</Label>
              <Switch checked={showThemeSwitch} onCheckedChange={setShowThemeSwitch} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Language switcher</Label>
              <Switch checked={showLocaleSwitcher} onCheckedChange={setShowLocaleSwitcher} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Social links</Label>
              <Switch checked={showSocialLinks} onCheckedChange={setShowSocialLinks} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">CTA button</Label>
              <Switch checked={showCta} onCheckedChange={setShowCta} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Login / Dashboard button</Label>
              <Switch checked={showAuthButtons} onCheckedChange={setShowAuthButtons} />
            </div>
          </CardContent>
        </Card>

        {showCta && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">CTA button (end of header)</CardTitle>
            </CardHeader>
            <CardContent>
              <PayloadLinkEditor value={cta} onChange={setCta} pages={pages} categories={categories} />
            </CardContent>
          </Card>
        )}

        {showSocialLinks && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Social links</CardTitle>
              <Button variant="outline" size="sm" onClick={addSocial}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {socialLinks.map((s, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="w-[220px]">
                    <IconPickerField
                      name={`social-icon-${index}`}
                      value={s.icon}
                      onChange={(icon) => setSocialLinks((prev) => prev.map((it, i) => (i === index ? { ...it, icon } : it)))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">URL</Label>
                    <Input
                      value={s.url}
                      placeholder="https://..."
                      onChange={(e) => setSocialLinks((prev) => prev.map((it, i) => (i === index ? { ...it, url: e.target.value } : it)))}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSocial(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {socialLinks.length === 0 && (
                <p className="text-sm text-muted-foreground">No social links — the site&apos;s default links will be used.</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {docStatus === "published" ? "Published" : "Draft"}
            {autosave.status === "saving" && " — Saving…"}
            {autosave.status === "saved" && " — All changes saved"}
            {autosave.status === "error" && ` — Autosave failed: ${autosave.error}`}
          </span>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
