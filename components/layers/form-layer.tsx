"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Eyebrow } from "@/components/ui/eyebrow"

export interface FormFieldDef {
  name: string
  label: string
  type: "text" | "email" | "textarea" | "checkbox"
  required?: boolean
}

export interface FormLayerProps {
  eyebrow?: string
  title?: string
  subtitle?: string
  name: string
  items: FormFieldDef[]
  submitLabel?: string
  successMessage?: string
}

/**
 * "form" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 * A generic ready-to-use form block — the fields it renders are entirely
 * authored in Payload (no hardcoded contact/newsletter distinction), submits
 * to POST /api/forms/submit which persists to db/schema.ts's
 * formSubmissions table, keyed by `name` (this block's form identity, stable
 * across page moves) — no email/CRM wiring yet, that's a separate decision.
 */
export function FormLayer({ eyebrow, title, subtitle, name, items, submitLabel, successMessage }: FormLayerProps) {
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formName: name, pagePath: window.location.pathname, fields: values }),
      })
      if (!res.ok) throw new Error("submit failed")
      setStatus("done")
    } catch {
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <div className="mx-auto mt-16 max-w-xl text-center">
        <p className="text-lg font-medium">{successMessage ?? "Merci, votre message a bien été envoyé."}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-16 max-w-xl">
      {eyebrow && <Eyebrow className="mb-2 text-center">{eyebrow}</Eyebrow>}
      {title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
      {subtitle && <p className="mt-3 text-center text-muted-foreground">{subtitle}</p>}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {items.map((field) => (
          <div key={field.name} className="space-y-2">
            {field.type === "checkbox" ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={field.name}
                  required={field.required}
                  checked={Boolean(values[field.name])}
                  onCheckedChange={(checked) => setValues((v) => ({ ...v, [field.name]: checked === true }))}
                />
                <Label htmlFor={field.name}>{field.label}</Label>
              </div>
            ) : (
              <>
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    required={field.required}
                    value={(values[field.name] as string) ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    required={field.required}
                    value={(values[field.name] as string) ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  />
                )}
              </>
            )}
          </div>
        ))}
        <Button type="submit" className="w-full" disabled={status === "submitting"}>
          {status === "submitting" ? "..." : (submitLabel ?? "Envoyer")}
        </Button>
        {status === "error" && (
          <p className="text-sm text-destructive">Une erreur est survenue, réessayez.</p>
        )}
      </form>
    </div>
  )
}
