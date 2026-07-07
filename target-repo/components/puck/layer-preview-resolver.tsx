"use client"

import type { ComponentType } from "react"
import { useResolvedLayerProps } from "@/lib/contexts/page-template-variables-context"

export function LayerPreviewResolver<T extends Record<string, unknown>>({
  component: Component,
  props,
}: {
  component: ComponentType<T>
  props: T
}) {
  const resolved = useResolvedLayerProps(props)
  return <Component {...resolved} />
}
