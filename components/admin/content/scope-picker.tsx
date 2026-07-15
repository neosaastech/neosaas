"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ScopeType, PayloadPageSummary, PayloadCategorySummary } from "@/lib/payload-bridge"

export interface ScopeFormValue {
  scopeType: ScopeType
  scopePageId: string
  scopeCategoryId: string
  scopePageType: string
}

export function emptyScope(): ScopeFormValue {
  return { scopeType: "default", scopePageId: "", scopeCategoryId: "", scopePageType: "" }
}

const PAGE_TYPE_OPTIONS = [
  { value: "landing", label: "Landing (marketing)" },
  { value: "article", label: "Article (blog)" },
  { value: "documentation", label: "Documentation (wiki)" },
]

/**
 * Shared by HeaderEditor and FooterEditor — where a doc applies: the whole
 * site (Default), one specific Page, one Category, or one Page Type.
 * Resolution precedence (applied on the public site, app/actions/site-nav.ts):
 * Page > Category > Page Type > Default.
 */
export function ScopePicker({
  value,
  onChange,
  pages,
  categories,
}: {
  value: ScopeFormValue
  onChange: (value: ScopeFormValue) => void
  pages: PayloadPageSummary[]
  categories: PayloadCategorySummary[]
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <Label className="text-xs">Scope</Label>
        <Select value={value.scopeType} onValueChange={(scopeType) => onChange({ ...value, scopeType: scopeType as ScopeType })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default (whole site)</SelectItem>
            <SelectItem value="page">Specific page</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="pageType">Page type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.scopeType === "page" && (
        <div>
          <Label className="text-xs">Page</Label>
          <Select value={value.scopePageId} onValueChange={(scopePageId) => onChange({ ...value, scopePageId })}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a page" />
            </SelectTrigger>
            <SelectContent>
              {pages.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.title} ({p.path})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {value.scopeType === "category" && (
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={value.scopeCategoryId} onValueChange={(scopeCategoryId) => onChange({ ...value, scopeCategoryId })}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {value.scopeType === "pageType" && (
        <div>
          <Label className="text-xs">Page type</Label>
          <Select value={value.scopePageType} onValueChange={(scopePageType) => onChange({ ...value, scopePageType })}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a type" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
