"use client"

import { useState } from "react"
import { ChevronDown, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PAGE_TEMPLATE_VARIABLE_CATALOG } from "@/lib/pages/template-variables-core"

const GROUP_LABELS: Record<string, string> = {
  site: "Site",
  date: "Date",
  user: "User",
  company: "Company",
}

/**
 * Charles (2026-07-09): "le module édition des page à les variables
 * dynamique. super mais on devrait classer comme sur payload dans des
 * onglets. là c'est trop fouilli" — was one long flat scroll (all 4 groups
 * stacked), now split into tabs matching the same Contenu/Organisation/SEO
 * pattern used in payload-cms's Pages/BlogPosts admin.
 */
export function TemplateVariablesHint({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact)
  const [copied, setCopied] = useState<string | null>(null)

  function copyToken(key: string) {
    const token = `{{${key}}}`
    navigator.clipboard.writeText(token)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const groups = [...new Set(PAGE_TEMPLATE_VARIABLE_CATALOG.map((v) => v.group))]

  return (
    <div className="rounded-lg border bg-muted/30 text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium"
      >
        <span>Dynamic variables</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t px-3 pb-3 pt-2">
          <p className="mb-3 text-xs text-muted-foreground">
            Use <code className="rounded bg-muted px-1">{"{{variable}}"}</code> in block text fields.
            Resolved at render time (not in the editor preview). Signed-out visitor → user fields are empty.
          </p>
          <Tabs defaultValue={groups[0]}>
            <TabsList className="h-8">
              {groups.map((group) => (
                <TabsTrigger key={group} value={group} className="text-xs">
                  {GROUP_LABELS[group] ?? group}
                </TabsTrigger>
              ))}
            </TabsList>
            {groups.map((group) => (
              <TabsContent key={group} value={group} className="mt-2">
                <ul className="space-y-1">
                  {PAGE_TEMPLATE_VARIABLE_CATALOG.filter((v) => v.group === group).map((variable) => (
                    <li key={variable.key} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <code className="text-xs">{`{{${variable.key}}}`}</code>
                        <span className="ml-2 text-xs text-muted-foreground">{variable.label}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => copyToken(variable.key)}
                        title={variable.description}
                      >
                        {copied === variable.key ? (
                          <Check className="size-3.5 text-green-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  )
}
