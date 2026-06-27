"use client"

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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-full max-w-sm surface border-subtle rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-red-500/10" : "bg-[var(--surface-2)]"}`}>
            <AlertTriangle size={18} className={danger ? "text-red-400" : ""} style={!danger ? { color: "var(--accent)" } : undefined} />
          </div>
          <p className="font-semibold text-sm">{title}</p>
        </div>
        <p className="text-sm text-secondary leading-snug">{message}</p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 p-3 rounded-xl bg-[var(--surface-2)] text-sm font-medium hover:opacity-80 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 p-3 rounded-xl text-sm font-medium transition text-white ${
              danger ? "bg-red-500 hover:bg-red-600" : "accent-gradient"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}