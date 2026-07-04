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

/** Builds a Zod schema straight from a FeatureConfig's fields — one
 * generic form for any feature, instead of a hand-written schema/form per
 * collection. */
function buildSchema(fields: FeatureFieldConfig[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {}
  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny =
      field.type === "number" ? z.coerce.number() : z.string()
    if (!field.required) {
      fieldSchema = fieldSchema.optional().or(z.literal(""))
    } else if (field.type !== "number") {
      fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} est requis`)
    }
    shape[field.name] = fieldSchema
  }
  return z.object(shape)
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
    defaultValues: initialValues ?? {},
  })

  async function onSubmit(values: Record<string, unknown>) {
    const url = documentId ? `/api/dashboard/${config.endpoint}/${documentId}` : `/api/dashboard/${config.endpoint}`
    const res = await fetch(url, {
      method: documentId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
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
