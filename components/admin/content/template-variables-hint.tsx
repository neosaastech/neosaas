"use client"

import { useState } from "react"
import { ChevronDown, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PAGE_TEMPLATE_VARIABLE_CATALOG } from "@/lib/pages/template-variables"

const GROUP_LABELS: Record<string, string> = {
  site: "Site",
  date: "Date",
  user: "Utilisateur",
  company: "Entreprise",
}

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
        <span>Variables dynamiques</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t px-3 pb-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Utilisez <code className="rounded bg-muted px-1">{"{{variable}}"}</code> dans les textes des blocs.
            Résolu à l&apos;affichage (pas dans l&apos;aperçu éditeur). Visiteur non connecté → champs utilisateur vides.
          </p>
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {GROUP_LABELS[group] ?? group}
              </p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
