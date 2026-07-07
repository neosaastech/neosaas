"use client"

import { useResolvedLayerProps } from "@/lib/contexts/page-template-variables-context"

export function BlogListPuckPreview({ title }: { title?: string }) {
  const resolved = useResolvedLayerProps({ title })
  return (
    <div className="mx-auto mt-16 max-w-5xl rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      <p className="font-medium">{resolved.title || "Liste d'articles"}</p>
      <p className="text-sm">
        Aperçu indisponible dans l&apos;éditeur — rendu en direct sur la vraie page (requête base de données).
      </p>
    </div>
  )
}
