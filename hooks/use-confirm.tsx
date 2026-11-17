"use client"

/**
 * useConfirm — the ONE way to ask a user to confirm an action (SAAS-178, 17/11/2026).
 *
 * Replaces the browser's native confirm(): no styling, no dark mode, English buttons,
 * blocks the page, and leaves no visible trace of what was confirmed. Rule: never call
 * window.confirm() — call `const confirm = useConfirm()` in the component, then
 * `if (!(await confirm({ title, description, destructive: true }))) return`.
 *
 * <ConfirmProvider> is mounted once in app/layout.tsx. Texts are in French by default.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"

export interface ConfirmOptions {
  title: ReactNode
  description?: ReactNode
  /** Label of the confirm button. Default: « Confirmer » (« Supprimer » when destructive). */
  confirmLabel?: string
  cancelLabel?: string
  /** Irreversible action: red confirm button. */
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((next) => {
    // A second request while one is open answers the first one « non » rather than losing it.
    resolver.current?.(false)
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }

  const confirmLabel = options?.confirmLabel ?? (options?.destructive ? "Supprimer" : "Confirmer")

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={options !== null} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description ? <AlertDialogDescription>{options.description}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>{options?.cancelLabel ?? "Annuler"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={options?.destructive ? buttonVariants({ variant: "destructive" }) : undefined}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (ctx) return ctx
  // Outside the provider (should not happen: it wraps the whole app) — never silently confirm.
  return async (options) => {
    console.warn("[useConfirm] ConfirmProvider absent — repli sur window.confirm")
    return window.confirm(typeof options.title === "string" ? options.title : "Confirmer ?")
  }
}
