"use client"

import { useEffect, useRef, useState } from "react"
import type { PDFDocumentLoadingTask } from "pdfjs-dist"

// pdf.js corre en un Worker aparte (para no trabar la UI mientras renderiza).
// Lo servimos como archivo estático desde /public en vez de depender de que
// el bundler resuelva la URL — así funciona igual en dev y producción, sin
// configuración extra de Next/Turbopack.
//
// IMPORTANTE: la versión del worker en public/pdf.worker.min.mjs tiene que
// coincidir EXACTO con la versión de "pdfjs-dist" en package.json — pdf.js
// revisa que ambas versiones matcheen y explota en tiempo de ejecución si no.
// Si actualizas la dependencia, tienes que volver a copiar el worker nuevo.
const WORKER_SRC = "/pdf.worker.min.mjs"

type Props = {
  url: string
}

// Por qué esto y no un <iframe src={url}>: Chrome en Android no renderiza
// PDFs embebidos dentro de un iframe como sí lo hace Chrome de escritorio —
// en vez de eso, navega la pestaña completa al PDF. Si esa URL es de otro
// origen (como una signed URL de Supabase Storage), esa navegación te saca
// de la PWA instalada hacia el navegador. Acá el PDF nunca se le entrega al
// navegador como PDF: pdf.js lo descarga como bytes y lo dibuja él mismo
// sobre un <canvas>, así que no hay ningún recurso "tipo PDF" que el
// sistema operativo pueda decidir abrir por su cuenta.
export default function PdfViewer({ url }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    let loadingTask: PDFDocumentLoadingTask | null = null

    const render = async () => {
      setCargando(true)
      setError(null)
      try {
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC

        loadingTask = pdfjsLib.getDocument({ url })
        const pdf = await loadingTask.promise
        if (cancelado) return

        const contenedor = contenedorRef.current
        if (!contenedor) return
        contenedor.innerHTML = ""

        // Ancho real disponible del modal — así se ve nítido en el teléfono
        // sin desbordarse, y no borroso en pantallas retina/alta densidad.
        const anchoDisponible = contenedor.clientWidth || 360
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        for (let numPagina = 1; numPagina <= pdf.numPages; numPagina++) {
          if (cancelado) return

          const pagina = await pdf.getPage(numPagina)
          const viewportBase = pagina.getViewport({ scale: 1 })
          const escala = (anchoDisponible / viewportBase.width) * dpr
          const viewport = pagina.getViewport({ scale: escala })

          const canvas = document.createElement("canvas")
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = "100%"
          canvas.style.height = "auto"
          canvas.style.display = "block"
          canvas.style.marginBottom = "8px"
          canvas.style.borderRadius = "8px"

          const ctx = canvas.getContext("2d")
          if (!ctx) continue

          await pagina.render({ canvasContext: ctx, viewport, canvas }).promise
          if (cancelado) return
          contenedor.appendChild(canvas)
        }
      } catch (e) {
        if (!cancelado) {
          console.error("Error renderizando PDF:", e)
          setError("No se pudo mostrar este PDF aquí.")
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    render()

    return () => {
      cancelado = true
      loadingTask?.destroy()
    }
  }, [url])

  return (
    <div className="w-full h-full overflow-auto p-2">
      {cargando && (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-center p-8">
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      <div ref={contenedorRef} className={cargando || error ? "hidden" : ""} />
    </div>
  )
}