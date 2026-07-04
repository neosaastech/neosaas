import type { FeatureConfig } from "@/types/form-builder"

/**
 * Single source of truth for Metadata-Driven UI dashboard features — same
 * pattern as lib/layers/registry.ts (page-builder blocks), applied here to
 * admin/dashboard CRUD screens instead. Adding a new feature means adding
 * one entry here, nothing else — see the "quotes" example below for the
 * shape (illustrative only: no real "quotes" Payload collection exists —
 * inventing one wasn't part of this scaffold, it's just documentation of
 * how a real feature would be added).
 */
export const featureRegistry: Record<string, FeatureConfig> = {
  // Example — not wired to a real Payload collection. Copy this shape to
  // add a real feature once its Payload collection exists.
  quotes: {
    title: "Gestion des Devis",
    endpoint: "quotes",
    fields: [
      { name: "clientName", label: "Client", type: "text", required: true, tableShow: true },
      { name: "amount", label: "Montant", type: "number", required: true, tableShow: true },
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
        ],
      },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
}
