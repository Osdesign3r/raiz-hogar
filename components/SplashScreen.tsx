"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const DURACION_MINIMA_MS = 1200  // para que no parpadee si todo resuelve instantáneo
const DURACION_FADE_MS   = 350

/**
 * Splash de arranque. Se queda visible hasta que se cumplan DOS cosas:
 *   1. Pasó el tiempo mínimo (evita el flash si todo carga muy rápido)
 *   2. La sesión de Supabase ya resolvió (algo real, no un número inventado)
 * Lo que tarde más de las dos gana — así si la red está lenta, el splash
 * se queda el tiempo que de verdad haga falta en vez de desaparecer antes
 * de que la app esté lista para mostrarse.
 *
 * Solo se muestra una vez por sesión de navegador (sessionStorage) — no en
 * cada navegación interna entre páginas, solo en el arranque real.
 */
export default function SplashScreen() {
  const [visible,   setVisible]   = useState(true)
  const [saliendo,  setSaliendo]  = useState(false)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("lazo_splash_visto")) {
      setVisible(false)
      return
    }

    let cancelado = false

    const tiempoMinimo = new Promise<void>(resolve => setTimeout(resolve, DURACION_MINIMA_MS))
    const sesionLista  = supabase.auth.getSession().catch(() => null)

    Promise.all([tiempoMinimo, sesionLista]).then(() => {
      if (cancelado) return
      setSaliendo(true)
      setTimeout(() => {
        if (cancelado) return
        setVisible(false)
        sessionStorage.setItem("lazo_splash_visto", "1")
      }, DURACION_FADE_MS)
    })

    return () => { cancelado = true }
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 transition-opacity ease-out ${
        saliendo ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ transitionDuration: `${DURACION_FADE_MS}ms` }}
    >
      {logoError ? (
        <div className="w-24 h-24 rounded-3xl accent-gradient flex items-center justify-center mb-5">
          <span className="text-4xl font-bold text-white">L</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/icon-512.png"
          alt="LAZO"
          width={96}
          height={96}
          className="w-24 h-24 rounded-3xl mb-5 shadow-lg shadow-black/40"
          onError={() => setLogoError(true)}
        />
      )}

      <p className="text-xl font-semibold tracking-wide text-white mb-1">LAZO</p>
      <p className="text-xs text-slate-500 mb-8">Tu hogar, en orden</p>

      {/* Indicador de "todavía cargando", no solo un logo estático */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
