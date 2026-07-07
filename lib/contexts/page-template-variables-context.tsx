"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  interpolateDeep,
  type PageTemplateVariables,
} from "@/lib/pages/template-variables-core"

interface PageTemplateVariablesContextValue {
  variables: PageTemplateVariables
  ready: boolean
  locale: string
}

const EMPTY_VARIABLES: PageTemplateVariables = {}

const PageTemplateVariablesContext = createContext<PageTemplateVariablesContextValue>({
  variables: EMPTY_VARIABLES,
  ready: false,
  locale: "fr",
})

export function PageTemplateVariablesProvider({
  locale,
  children,
}: {
  locale: string
  children: ReactNode
}) {
  const [variables, setVariables] = useState<PageTemplateVariables>(EMPTY_VARIABLES)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)

    fetch(`/api/pages/template-variables?locale=${encodeURIComponent(locale)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : EMPTY_VARIABLES))
      .then((data: PageTemplateVariables) => {
        if (!cancelled) {
          setVariables(data)
          setReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVariables(EMPTY_VARIABLES)
          setReady(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [locale])

  const value = useMemo(() => ({ variables, ready, locale }), [variables, ready, locale])

  return (
    <PageTemplateVariablesContext.Provider value={value}>{children}</PageTemplateVariablesContext.Provider>
  )
}

export function usePageTemplateVariables() {
  return useContext(PageTemplateVariablesContext)
}

/** Resolve `{{variables}}` in layer props for editor previews (Puck, Content Hub). */
export function useResolvedLayerProps<T>(props: T): T {
  const { variables, ready } = usePageTemplateVariables()
  return useMemo(() => (ready ? interpolateDeep(props, variables) : props), [props, variables, ready])
}
