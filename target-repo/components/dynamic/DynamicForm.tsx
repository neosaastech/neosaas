"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FeatureConfig, FeatureFieldConfig } from "@/types/form-builder"

function isValidJson(value: string): boolean {
  if (!value) return true
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

/** Builds a Zod schema straight from a FeatureConfig's fields — one
 * generic form for any feature, instead of a hand-written schema/form per
 * collection. "json" fields are validated as raw text here (must parse as
 * valid JSON) and converted to a real object at submit time — react-hook-form
 * always holds the textarea's string, Payload's json field wants the
 * parsed value. */
function buildSchema(fields: FeatureFieldConfig[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {}
  for (const field of fields) {
    if (field.type === "json") {
      let jsonSchema: z.ZodTypeAny = z.string().refine(isValidJson, "JSON invalide")
      if (!field.required) jsonSchema = jsonSchema.optional().or(z.literal(""))
      shape[field.name] = jsonSchema
      continue
    }
    let fieldSchema: z.ZodTypeAny = field.type === "number" ? z.coerce.number() : z.string()
    if (!field.required) {
      fieldSchema = fieldSchema.optional().or(z.literal(""))
    } else if (field.type !== "number") {
      fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} est requis`)
    }
    shape[field.name] = fieldSchema
  }
  return z.object(shape)
}

/** Payload returns "json" fields as parsed objects, but the form needs
 * strings to populate a textarea — stringify on the way in, parse back on
 * the way out (handleSubmit below). */
function toFormValues(config: FeatureConfig, values: Record<string, unknown>): Record<string, unknown> {
  const result = { ...values }
  for (const field of config.fields) {
    if (field.type === "json" && result[field.name] !== undefined && typeof result[field.name] !== "string") {
      result[field.name] = JSON.stringify(result[field.name], null, 2)
    }
  }
  return result
}

function toApiValues(config: FeatureConfig, values: Record<string, unknown>): Record<string, unknown> {
  const result = { ...values }
  for (const field of config.fields) {
    if (field.type === "json" && typeof result[field.name] === "string") {
      const raw = result[field.name] as string
      result[field.name] = raw ? JSON.parse(raw) : undefined
    }
  }
  return result
}

export function DynamicForm({
  config,
  initialValues,
  documentId,
  onSuccess,
}: {
  config: FeatureConfig
  initialValues?: Record<string, unknown>
  documentId?: string | number
  onSuccess?: () => void
}) {
  const schema = buildSchema(config.fields)
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(config, initialValues ?? {}),
  })

  async function onSubmit(values: Record<string, unknown>) {
    const url = documentId ? `/api/dashboard/${config.endpoint}/${documentId}` : `/api/dashboard/${config.endpoint}`
    const res = await fetch(url, {
      method: documentId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toApiValues(config, values)),
    })
    if (res.ok) {
      onSuccess?.()
    } else {
      form.setError("root", { message: "Échec de l'enregistrement" })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {config.fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          {field.type === "select" ? (
            <Select
              value={(form.watch(field.name) as string) ?? ""}
              onValueChange={(value) => form.setValue(field.name, value)}
            >
              <SelectTrigger id={field.name}>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === "textarea" ? (
            <Textarea id={field.name} {...form.register(field.name)} />
          ) : field.type === "json" ? (
            <Textarea
              id={field.name}
              className="font-mono text-xs"
              rows={6}
              placeholder={field.jsonHint ?? "{}"}
              {...form.register(field.name)}
            />
          ) : (
            <Input
              id={field.name}
              type={field.type === "number" ? "number" : "text"}
              {...form.register(field.name)}
            />
          )}
          {form.formState.errors[field.name] && (
            <p className="text-sm text-destructive">{String(form.formState.errors[field.name]?.message)}</p>
          )}
        </div>
      ))}
      {form.formState.errors.root && (
        <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      )}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {documentId ? "Enregistrer" : "Créer"}
      </Button>
    </form>
  )
}
