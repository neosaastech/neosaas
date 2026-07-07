"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { DynamicTable } from "@/components/dynamic/DynamicTable"
import { DynamicForm } from "@/components/dynamic/DynamicForm"
import type { FeatureConfig } from "@/types/form-builder"

/** Assembles a full Metadata-Driven UI screen for one FeatureConfig: title,
 * "New" button opening DynamicForm in a modal, and DynamicTable below —
 * clicking a row opens the same form pre-filled for editing. */
export function FeaturePage({ config }: { config: FeatureConfig }) {
  const [editingDoc, setEditingDoc] = useState<Record<string, unknown> | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const isOpen = isCreating || editingDoc !== null

  function close() {
    setIsCreating(false)
    setEditingDoc(null)
  }

  function handleSuccess() {
    close()
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      <DynamicTable config={config} onRowClick={setEditingDoc} refreshKey={refreshKey} />

      <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Edit" : "New"}</DialogTitle>
          </DialogHeader>
          <DynamicForm
            config={config}
            initialValues={editingDoc ?? undefined}
            documentId={editingDoc?.id as string | number | undefined}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
