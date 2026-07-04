import type { FeatureConfig } from "@/types/form-builder"

/**
 * Single source of truth for Metadata-Driven UI dashboard features — same
 * pattern as lib/layers/registry.ts (page-builder blocks), applied here to
 * admin/dashboard CRUD screens instead. Adding a new feature means adding
 * one entry here, nothing else.
 *
 * The registry key is the URL segment under /dashboard/[feature] (French,
 * user-facing — "devis"), independent from `endpoint`, the Payload
 * collection slug (English, matches every other collection's naming).
 */
export const featureRegistry: Record<string, FeatureConfig> = {
  /**
   * First real feature validating the scaffold end-to-end (Notion "Spec
   * complète — Gestion des Devis"). V1 scope, confirmed by Charles
   * 2026-07-04: flat fields only, one global `amount` (no repeatable line
   * items — DynamicForm doesn't support array fields yet), a `metadata`
   * json field as the escape hatch if raw line data is needed later
   * without extending the form engine.
   */
  devis: {
    title: "Gestion des Devis",
    endpoint: "quotes",
    fields: [
      { name: "reference", label: "Référence", type: "text", required: true, tableShow: true },
      { name: "clientName", label: "Client", type: "text", required: true, tableShow: true },
      { name: "clientEmail", label: "Email client", type: "text", required: true },
      { name: "clientPhone", label: "Téléphone client", type: "text" },
      { name: "title", label: "Objet", type: "text", required: true, tableShow: true },
      { name: "amount", label: "Montant HT", type: "number", required: true, tableShow: true },
      {
        name: "vatRate",
        label: "TVA",
        type: "select",
        required: true,
        options: [
          { label: "0%", value: "0" },
          { label: "5.5%", value: "5.5" },
          { label: "10%", value: "10" },
          { label: "20%", value: "20" },
        ],
      },
      {
        name: "status",
        label: "Statut",
        type: "select",
        required: true,
        tableShow: true,
        options: [
          { label: "Brouillon", value: "draft" },
          { label: "Envoyé", value: "sent" },
          { label: "Accepté", value: "accepted" },
          { label: "Refusé", value: "rejected" },
          { label: "Expiré", value: "expired" },
        ],
      },
      { name: "validUntil", label: "Valide jusqu'au (AAAA-MM-JJ)", type: "text", tableShow: true },
      { name: "notes", label: "Notes internes", type: "textarea" },
      {
        name: "metadata",
        label: "Métadonnées (JSON)",
        type: "json",
        jsonHint: '{ "lineItems": [{ "label": "...", "qty": 1, "unitPrice": 0 }] }',
      },
    ],
  },
}
