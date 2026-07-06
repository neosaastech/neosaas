"use client"

import { useEffect } from "react"

/** Sets the browser tab title for client-side dashboard pages. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
    return () => {
      document.title = previousTitle
    }
  }, [title])
}
