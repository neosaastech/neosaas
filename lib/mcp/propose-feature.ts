import { z } from "zod"
import type { FeatureConfig, FeatureFieldConfig } from "@/types/form-builder"

export const featureFieldConfigSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "number", "select", "textarea", "json"]),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  jsonHint: z.string().optional(),
  required: z.boolean().optional(),
  tableShow: z.boolean().optional(),
})

export interface ProposedFeatureModule {
  slug: string
  config: FeatureConfig
  rationale: string[]
  warnings: string[]
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

function inferFieldsFromIntent(intent: string): FeatureFieldConfig[] {
  const fields: FeatureFieldConfig[] = [
    { name: "title", label: "Title", type: "text", required: true, tableShow: true },
    { name: "status", label: "Status", type: "select", required: true, tableShow: true, options: [
      { label: "Draft", value: "draft" },
      { label: "Active", value: "active" },
      { label: "Archived", value: "archived" },
    ]},
  ]

  const lower = intent.toLowerCase()
  if (lower.includes("amount") || lower.includes("montant") || lower.includes("price")) {
    fields.push({ name: "amount", label: "Amount", type: "number", required: true, tableShow: true })
  }
  if (lower.includes("email")) {
    fields.push({ name: "email", label: "Email", type: "text", required: true, tableShow: true })
  }
  if (lower.includes("note")) {
    fields.push({ name: "notes", label: "Notes", type: "textarea" })
  }
  if (lower.includes("client") || lower.includes("customer")) {
    fields.push({ name: "clientName", label: "Client", type: "text", required: true, tableShow: true })
  }

  return fields
}

export function proposeFeatureModule(input: {
  intent: string
  vertical?: string
  slug?: string
  title?: string
  endpoint?: string
}): ProposedFeatureModule {
  const rationale: string[] = ["Generated from natural-language intent using NeoSaaS metadata-driven defaults"]
  const warnings: string[] = []

  const slug = input.slug ? slugify(input.slug) : slugify(input.intent.split(" ").slice(0, 3).join("-") || "module")
  const title = input.title ?? input.intent.replace(/\.$/, "").slice(0, 80)
  const endpoint = input.endpoint ? slugify(input.endpoint) : slug

  if (!slug) {
    throw new Error("Could not derive a valid feature slug from intent")
  }

  const fields = inferFieldsFromIntent(input.intent)
  if (fields.length < 2) {
    warnings.push("Very few fields inferred — review before publish")
  }

  if (input.vertical) {
    rationale.push(`Vertical context: ${input.vertical}`)
  }

  return {
    slug,
    config: { title, endpoint, fields },
    rationale,
    warnings,
  }
}
