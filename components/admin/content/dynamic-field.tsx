"use client"

import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"

/**
 * Generic form field renderer driven directly by a block's Zod propsSchema
 * (lib/layers/registry.ts) — one renderer for all 7 block types (and any
 * future one), instead of a hand-built form per block. Introspects Zod v3's
 * `_def.typeName` (ZodString/ZodNumber/ZodBoolean/ZodEnum/ZodOptional/
 * ZodArray/ZodObject) — the same finite set of node kinds every block's
 * schema is actually built from (see lib/layers/registry.ts), not a
 * general-purpose Zod-to-form library.
 */

function unwrapOptional(schema: z.ZodTypeAny): { schema: z.ZodTypeAny; optional: boolean } {
  if (schema instanceof z.ZodOptional) {
    return { schema: schema.unwrap(), optional: true }
  }
  return { schema, optional: false }
}

export function DynamicObjectForm({
  schema,
  value,
  onChange,
}: {
  schema: z.ZodObject<z.ZodRawShape>
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(schema.shape).map(([key, fieldSchema]) => (
        <DynamicField
          key={key}
          name={key}
          schema={fieldSchema as z.ZodTypeAny}
          value={value[key]}
          onChange={(next) => onChange({ ...value, [key]: next })}
        />
      ))}
    </div>
  )
}

function DynamicField({
  name,
  schema,
  value,
  onChange,
}: {
  name: string
  schema: z.ZodTypeAny
  value: unknown
  onChange: (next: unknown) => void
}) {
  const { schema: inner } = unwrapOptional(schema)

  if (inner instanceof z.ZodArray) {
    return <DynamicArrayField name={name} elementSchema={inner.element} value={(value as unknown[]) ?? []} onChange={onChange} />
  }

  if (inner instanceof z.ZodEnum) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{name}</Label>
        <Select value={(value as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger id={name}>
            <SelectValue placeholder="Choisir..." />
          </SelectTrigger>
          <SelectContent>
            {inner.options.map((opt: string) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (inner instanceof z.ZodBoolean) {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={name}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <Label htmlFor={name}>{name}</Label>
      </div>
    )
  }

  if (inner instanceof z.ZodNumber) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{name}</Label>
        <Input
          id={name}
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      </div>
    )
  }

  // ZodString (and default fallback) — long-form fields (subtitle/body/description)
  // get a textarea for comfort, everything else a single-line input.
  const isLongText = /subtitle|description|body|excerpt/i.test(name)
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{name}</Label>
      {isLongText ? (
        <Textarea id={name} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={name} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

function DynamicArrayField({
  name,
  elementSchema,
  value,
  onChange,
}: {
  name: string
  elementSchema: z.ZodTypeAny
  value: unknown[]
  onChange: (next: unknown[]) => void
}) {
  const isObjectArray = elementSchema instanceof z.ZodObject

  function addItem() {
    const empty = isObjectArray
      ? Object.fromEntries(Object.keys((elementSchema as z.ZodObject<z.ZodRawShape>).shape).map((k) => [k, undefined]))
      : ""
    onChange([...value, empty])
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateItem(index: number, next: unknown) {
    onChange(value.map((item, i) => (i === index ? next : item)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{name}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {value.map((item, index) => (
          <Card key={index} shadow="flat">
            <CardContent className="flex flex-col gap-3 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {isObjectArray ? (
                    <DynamicObjectForm
                      schema={elementSchema as z.ZodObject<z.ZodRawShape>}
                      value={(item as Record<string, unknown>) ?? {}}
                      onChange={(next) => updateItem(index, next)}
                    />
                  ) : (
                    <Input value={(item as string) ?? ""} onChange={(e) => updateItem(index, e.target.value)} />
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
