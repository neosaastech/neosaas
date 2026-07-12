"use client"

import { useEffect, useRef, useState } from "react"

export type AutosaveStatus = "idle" | "saving" | "saved" | "error"

/**
 * Debounced background save: fires `save(value)` `delay`ms after the last
 * change, coalescing rapid edits (typing) into one request instead of one
 * per keystroke. Skips the initial mount — loading an existing document
 * into the editor must never itself count as an edit — and flushes once
 * more on unmount so closing the editor right after typing doesn't drop
 * the last few keystrokes.
 *
 * `value` is diffed by JSON content, not reference, since callers pass a
 * fresh snapshot object every render.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  { delay = 800, enabled = true }: { delay?: number; enabled?: boolean } = {},
): { status: AutosaveStatus; error: string | null } {
  const [status, setStatus] = useState<AutosaveStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const serialized = JSON.stringify(value)
  const latestSerialized = useRef(serialized)
  latestSerialized.current = serialized

  const saveRef = useRef(save)
  saveRef.current = save

  const skipFirst = useRef(true)
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const dirtyDuringFlight = useRef(false)

  async function runSave() {
    if (inFlight.current) {
      dirtyDuringFlight.current = true
      return
    }
    inFlight.current = true
    setStatus("saving")
    try {
      await saveRef.current(JSON.parse(latestSerialized.current) as T)
      setStatus("saved")
      setError(null)
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Autosave failed")
    } finally {
      inFlight.current = false
      if (dirtyDuringFlight.current) {
        dirtyDuringFlight.current = false
        void runSave()
      }
    }
  }

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    if (!enabled) return

    if (pendingTimer.current) clearTimeout(pendingTimer.current)
    pendingTimer.current = setTimeout(() => {
      pendingTimer.current = null
      void runSave()
    }, delay)

    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, enabled, delay])

  useEffect(() => {
    return () => {
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current)
        pendingTimer.current = null
        void runSave()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { status, error }
}
