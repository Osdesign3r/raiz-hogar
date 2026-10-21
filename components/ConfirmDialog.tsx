"use client"

import { useEffect, useId, useRef } from "react"
import { AlertTriangle } from "lucide-react"

type Props = {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title = "¿Eliminar?",
  message,
  confirmLabel = "Eliminar",
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const onCancelRef = useRef(onCancel)
  useEffect(() => { onCancelRef.current = onCancel })

  useEffect(() => {
    if (!open) return
    const previo = document.activeElement as HTMLElement | null
    // El foco arranca en "Cancelar": confirmar una eliminación por accidente
    // (Enter/Espacio al abrir) es peor que tener que tocar dos veces.
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelRef.current() }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      previo?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: "var(--z-dialog)" }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="rise relative w-full max-w-sm space-y-4 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-5"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: danger
                ? "color-mix(in srgb, var(--danger) 16%, transparent)"
                : "var(--surface-2)",
            }}
          >
            <AlertTriangle size={20} style={{ color: danger ? "var(--danger)" : "var(--accent-text)" }} />
          </div>
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        </div>
        <p className="text-[0.9375rem] leading-relaxed text-secondary">{message}</p>
        <div className="flex gap-2 pt-1">
          <button ref={cancelRef} onClick={onCancel} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`btn flex-1 ${danger ? "btn-danger" : "btn-primary"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
