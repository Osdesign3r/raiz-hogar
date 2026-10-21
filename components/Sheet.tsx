"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { X } from "lucide-react"

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Hoja inferior (bottom sheet) compartida por finanzas, calendario, documentos
 * y familia. Antes cada página tenía su propia copia del markup + un estado
 * `hojaVisible` para animar la entrada; ahora la animación vive aquí.
 *
 * Accesibilidad: role="dialog" + aria-modal, se cierra con Escape y con el
 * fondo, bloquea el scroll del body mientras está abierta y devuelve el foco
 * al elemento que la abrió.
 */
export default function Sheet({ open, title, onClose, children }: Props) {
  const [visible, setVisible] = useState(false)
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // Las páginas pasan onClose como función inline (cambia en cada render).
  // Si fuera dependencia del efecto, la hoja se reiniciaría y robaría el foco
  // en cada tecla escrita en un formulario.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return

    const previo = document.activeElement as HTMLElement | null
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = "hidden"

    // Un frame después del montaje, para que el navegador vea el estado
    // inicial (fuera de pantalla) y la transición sí se anime.
    const raf = requestAnimationFrame(() => setVisible(true))

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current() }
    document.addEventListener("keydown", onKey)

    return () => {
      cancelAnimationFrame(raf)
      setVisible(false)
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflowPrevio
      previo?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: "var(--z-sheet)" }}>
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full max-w-md md:max-w-xl max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-x border-[var(--border-strong)] bg-[var(--surface)] px-4 pt-2 transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        {/* Asa visual: indica que es una hoja que se puede cerrar */}
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-[var(--surface-3)]" aria-hidden="true" />

        <div className="sticky top-0 z-10 -mx-4 mb-3 flex items-center justify-between bg-[var(--surface)] px-4 pb-2 pt-1">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="icon-btn -mr-2" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}
